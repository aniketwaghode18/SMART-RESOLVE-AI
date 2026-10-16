/**
 * orderController.js
 * Controller for managing e-commerce orders.
 */

'use strict';

const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const VALID_STATUSES = ['PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELAYED', 'CANCELLED'];

/**
 * GET /api/orders
 * Returns orders for authenticated customer, or all orders for agents/admins.
 */
async function getOrders(req, res, next) {
  try {
    const { role, _id: userId } = req.user;
    const { status, customerId, search, page = 1, limit = 50 } = req.query;

    const query = {};

    // Customers can only see their own orders
    if (role === 'customer') {
      query.customerId = userId;
    } else if (customerId) {
      // Agents/admins can filter by customerId
      query.customerId = customerId;
    }

    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('customerId', 'name email membershipLevel')
      .lean();

    return successResponse(res, {
      orders,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    logger.error(`[orderController] getOrders error: ${err.message}`);
    next(err);
  }
}

/**
 * GET /api/orders/:orderId
 * Returns a single order by orderId or MongoDB ObjectId.
 */
async function getOrderById(req, res, next) {
  try {
    const { orderId } = req.params;
    const { role, _id: userId } = req.user;

    const order = await Order.findOne({
      $or: [{ orderId: orderId.toUpperCase() }, { orderId: orderId }]
    })
      .populate('customerId', 'name email membershipLevel')
      .lean();

    if (!order) {
      return errorResponse(res, 'ORDER_NOT_FOUND', `Order '${orderId}' not found.`, 404);
    }

    // Role check: customer can only access their own order
    const orderCustomerId = order.customerId?._id?.toString() || order.customerId?.toString();
    if (role === 'customer' && orderCustomerId !== userId.toString()) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this order.', 403);
    }

    return successResponse(res, { order });
  } catch (err) {
    logger.error(`[orderController] getOrderById error: ${err.message}`);
    next(err);
  }
}

/**
 * PATCH /api/orders/:orderId/status
 * Updates status of an order. Restricted to agents and admins.
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return errorResponse(res, 'INVALID_STATUS', `Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const updateData = { status: status.toUpperCase() };
    if (status.toUpperCase() === 'DELIVERED') {
      updateData.actualDelivery = new Date();
    }

    const order = await Order.findOneAndUpdate(
      { $or: [{ orderId: orderId.toUpperCase() }, { orderId: orderId }] },
      updateData,
      { new: true }
    );

    if (!order) {
      return errorResponse(res, 'ORDER_NOT_FOUND', `Order '${orderId}' not found.`, 404);
    }

    logger.info(`[orderController] order "${order.orderId}" status updated to "${order.status}"`);
    return successResponse(res, { order });
  } catch (err) {
    logger.error(`[orderController] updateOrderStatus error: ${err.message}`);
    next(err);
  }
}

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus
};
