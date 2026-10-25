import Painting from '../models/Painting.js';
import Order from '../models/Order.js';

// GET /api/paintings - Browse all paintings
export async function getAllPaintings(req, res) {
  try {
    const paintings = await Painting.find().sort({ id: 1 });
    return res.status(200).json({ paintings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch paintings: ' + err.message });
  }
}

// GET /api/paintings/:id - Get a single painting
export async function getPaintingById(req, res) {
  try {
    const painting = await Painting.findOne({ id: req.params.id });
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found.' });
    }
    return res.status(200).json({ painting });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching painting: ' + err.message });
  }
}

// POST /api/paintings - Admin only: Add a new painting
export async function createPainting(req, res) {
  try {
    const { id, title, artist, description, price, imageUrl } = req.body;

    if (!id || !title || !artist || !description || price === undefined || !imageUrl) {
      return res.status(400).json({ error: 'All painting fields (id, title, artist, description, price, imageUrl) are required.' });
    }

    if (Number(price) < 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    const existing = await Painting.findOne({ id: id.trim() });
    if (existing) {
      return res.status(409).json({ error: `Painting with ID "${id}" already exists.` });
    }

    const painting = await Painting.create({
      id: id.trim(),
      title: title.trim(),
      artist: artist.trim(),
      description: description.trim(),
      price: Number(price),
      imageUrl: imageUrl.trim(),
      status: 'available'
    });

    return res.status(201).json({ message: 'Painting created successfully', painting });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create painting: ' + err.message });
  }
}

// PUT /api/paintings/:id - Admin only: Edit an available painting
export async function updatePainting(req, res) {
  try {
    const { title, artist, description, price, imageUrl } = req.body;
    const painting = await Painting.findOne({ id: req.params.id });

    if (!painting) {
      return res.status(404).json({ error: 'Painting not found.' });
    }

    // Business rule: Only available paintings can be edited
    if (painting.status === 'sold') {
      return res.status(400).json({ error: 'Sold paintings cannot be modified.' });
    }

    if (title) painting.title = title.trim();
    if (artist) painting.artist = artist.trim();
    if (description) painting.description = description.trim();
    if (price !== undefined) {
      if (Number(price) < 0) return res.status(400).json({ error: 'Price must be a positive number.' });
      painting.price = Number(price);
    }
    if (imageUrl) painting.imageUrl = imageUrl.trim();

    await painting.save();
    return res.status(200).json({ message: 'Painting updated successfully', painting });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update painting: ' + err.message });
  }
}

// POST /api/paintings/:id/purchase - Customer: Purchase an available painting
export async function purchasePainting(req, res) {
  const paintingId = req.params.id;

  try {
    // 1. Atomic check and update using findOneAndUpdate to ensure only one purchaser succeeds
    const updatedPainting = await Painting.findOneAndUpdate(
      { id: paintingId, status: 'available' },
      { status: 'sold' },
      { new: true }
    );

    if (!updatedPainting) {
      const existing = await Painting.findOne({ id: paintingId });
      if (!existing) {
        return res.status(404).json({ error: 'Painting not found.' });
      }
      return res.status(409).json({ error: 'This painting is already sold and unavailable for purchase.' });
    }

    // 2. Create the order record, leveraging partial unique index on { paintingId: 1, status: 'placed' }
    try {
      const order = await Order.create({
        paintingId: updatedPainting.id,
        paintingTitle: updatedPainting.title,
        price: updatedPainting.price,
        customer: req.user._id,
        customerEmail: req.user.email,
        status: 'placed'
      });

      updatedPainting.activeOrderId = order._id;
      await updatedPainting.save();

      return res.status(201).json({
        message: 'Painting purchased successfully!',
        order,
        painting: updatedPainting
      });
    } catch (orderErr) {
      // Rollback painting status if order creation fails (e.g. index collision)
      await Painting.findOneAndUpdate(
        { id: paintingId },
        { status: 'available', activeOrderId: null }
      );
      return res.status(409).json({ error: 'Duplicate purchase prevented. An active order already exists for this painting.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to complete purchase: ' + err.message });
  }
}

// POST /api/paintings/orders/:orderId/cancel - Customer: Cancel own placed order
export async function cancelOrder(req, res) {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Return 404 when a customer tries to access another customer's record
    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status !== 'placed') {
      return res.status(400).json({ error: `Cannot cancel an order that is already ${order.status}.` });
    }

    // Cancel order and return painting to available
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    await Painting.findOneAndUpdate(
      { id: order.paintingId },
      { status: 'available', activeOrderId: null }
    );

    return res.status(200).json({ message: 'Order cancelled successfully. Painting is once again available.', order });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel order: ' + err.message });
  }
}

// GET /api/paintings/orders/my - Customer: View own orders
export async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch customer orders.' });
  }
}

// GET /api/paintings/orders/all - Admin: View all orders
export async function getAllOrders(req, res) {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch all orders.' });
  }
}
