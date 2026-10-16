/**
 * orderRoutes.js
 * Routes for managing e-commerce orders.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAgent } = require('../middleware/authMiddleware');
const { getOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController');

// All order routes require authentication
router.use(authenticate);

// GET /api/orders (customers see own orders, agents/admins see all)
router.get('/', getOrders);

// GET /api/orders/:orderId (view specific order)
router.get('/:orderId', getOrderById);

// PATCH /api/orders/:orderId/status (agents/admins update order status)
router.patch('/:orderId/status', requireAgent, updateOrderStatus);

module.exports = router;
