/**
 * evaluationController.js
 * Controller for prompt evaluation benchmark and prompt versioning.
 */

'use strict';

const PromptVersion = require('../models/PromptVersion');
const { runEvaluation, getTestCases } = require('../evaluation/evaluator');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// In-memory cache for recent evaluation reports
const evaluationHistory = [];

/**
 * GET /api/evaluation/test-cases
 * Returns the benchmark test cases.
 */
function getEvaluationTestCases(req, res) {
  const cases = getTestCases();
  return successResponse(res, {
    total: cases.length,
    testCases: cases
  });
}

/**
 * POST /api/evaluation/run
 * Runs the benchmark test suite and computes metrics.
 */
async function executeEvaluation(req, res, next) {
  try {
    const { sampleSize, promptVersionId } = req.body;

    logger.info(`[evaluationController] running evaluation benchmark (sampleSize: ${sampleSize || 'all'})...`);
    const report = await runEvaluation({ sampleSize });

    // Store in history (keep latest 20)
    evaluationHistory.unshift(report);
    if (evaluationHistory.length > 20) evaluationHistory.pop();

    // If promptVersionId provided, update the PromptVersion metrics in DB
    if (promptVersionId) {
      await PromptVersion.findByIdAndUpdate(promptVersionId, {
        accuracy: report.metrics.intentAccuracy,
        latency: report.metrics.avgLatencyPerCase,
        hallucinationRate: report.metrics.hallucinationRate,
        sampleSize: report.totalCases
      });
    }

    return successResponse(res, { report });
  } catch (err) {
    logger.error(`[evaluationController] executeEvaluation error: ${err.message}`);
    next(err);
  }
}

/**
 * GET /api/evaluation/history
 * Returns historical evaluation results.
 */
function getEvaluationHistory(req, res) {
  return successResponse(res, {
    count: evaluationHistory.length,
    history: evaluationHistory
  });
}

/**
 * GET /api/evaluation/versions
 * Returns all prompt versions from the database.
 */
async function getPromptVersions(req, res, next) {
  try {
    const versions = await PromptVersion.find().sort({ createdAt: -1 }).lean();
    return successResponse(res, { versions });
  } catch (err) {
    logger.error(`[evaluationController] getPromptVersions error: ${err.message}`);
    next(err);
  }
}

/**
 * POST /api/evaluation/versions
 * Creates a new prompt version. Admin only.
 */
async function createPromptVersion(req, res, next) {
  try {
    const { promptVersion, promptName, promptType, promptText, description, active } = req.body;

    if (!promptVersion || !promptName || !promptType || !promptText) {
      return errorResponse(res, 'VALIDATION_ERROR', 'promptVersion, promptName, promptType, and promptText are required.', 400);
    }

    const versionDoc = await PromptVersion.create({
      promptVersion,
      promptName,
      promptType,
      promptText,
      description: description || '',
      active: Boolean(active)
    });

    logger.info(`[evaluationController] prompt version created: ${versionDoc.promptName} (${versionDoc.promptVersion})`);
    return successResponse(res, { version: versionDoc }, 201);
  } catch (err) {
    logger.error(`[evaluationController] createPromptVersion error: ${err.message}`);
    next(err);
  }
}

module.exports = {
  getEvaluationTestCases,
  executeEvaluation,
  getEvaluationHistory,
  getPromptVersions,
  createPromptVersion
};
