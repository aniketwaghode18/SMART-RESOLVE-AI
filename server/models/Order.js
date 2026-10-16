const mongoose = require('mongoose');

const ORDER_STATUSES = ['PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELAYED', 'CANCELLED'];

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  orderDate: { type: Date, required: true },
  shippingDate: { type: Date },
  expectedDelivery: { type: Date },
  actualDelivery: { type: Date },
  status: { type: String, enum: ORDER_STATUSES, default: 'PROCESSING' },
  paymentMethod: { type: String, enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'cod'], required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  shippingAddress: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
