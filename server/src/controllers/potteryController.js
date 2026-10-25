import { PotteryItem, Glaze, PotteryRequest } from '../models/Pottery.js';

// Helper to calculate days from today
function getDaysDifferenceFromToday(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString + 'T00:00:00');
  if (isNaN(targetDate.getTime())) return null;
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// GET /api/pottery/options - Get all seeded pottery items and glazes
export async function getPotteryOptions(req, res) {
  try {
    const [items, glazes] = await Promise.all([
      PotteryItem.find().sort({ id: 1 }),
      Glaze.find().sort({ id: 1 })
    ]);
    return res.status(200).json({ items, glazes });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch pottery options: ' + err.message });
  }
}

// POST /api/pottery/requests - Customer submits a custom pottery request
export async function createPotteryRequest(req, res) {
  try {
    const { potteryItemId, glazeId, quantity, neededByDate, notes } = req.body;

    if (!potteryItemId || !glazeId || quantity === undefined || !neededByDate) {
      return res.status(400).json({ error: 'Pottery item, glaze, quantity, and needed-by date are required.' });
    }

    // 1. Quantity validation: 1–12
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 12) {
      return res.status(400).json({ error: 'Quantity must be an integer between 1 and 12.' });
    }

    // 2. Needed-by date validation: at least 14 days away
    const diffDays = getDaysDifferenceFromToday(neededByDate);
    if (diffDays === null) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    if (diffDays < 14) {
      return res.status(400).json({
        error: `Needed-by date must be at least 14 days away (selected date is ${diffDays} day(s) away).`
      });
    }

    // 3. Verify pottery item and glaze exist in seeded catalog
    const [item, glaze] = await Promise.all([
      PotteryItem.findOne({ id: potteryItemId }),
      Glaze.findOne({ id: glazeId })
    ]);

    if (!item) {
      return res.status(400).json({ error: `Selected pottery item "${potteryItemId}" is not valid.` });
    }

    if (!glaze) {
      return res.status(400).json({ error: `Selected glaze "${glazeId}" is not valid.` });
    }

    const request = await PotteryRequest.create({
      customer: req.user._id,
      customerEmail: req.user.email,
      potteryItemId: item.id,
      potteryItemName: item.name,
      glazeId: glaze.id,
      glazeName: glaze.name,
      quantity: qty,
      neededByDate,
      notes: notes ? notes.trim() : '',
      status: 'requested'
    });

    return res.status(201).json({
      message: 'Custom pottery request submitted successfully!',
      request
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create pottery request: ' + err.message });
  }
}

// GET /api/pottery/requests/my - Customer views own requests
export async function getMyPotteryRequests(req, res) {
  try {
    const requests = await PotteryRequest.find({ customer: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ requests });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch customer pottery requests.' });
  }
}

// GET /api/pottery/requests/all - Admin views all pottery requests
export async function getAllPotteryRequests(req, res) {
  try {
    const requests = await PotteryRequest.find().sort({ createdAt: -1 });
    return res.status(200).json({ requests });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch all pottery requests.' });
  }
}

// PUT /api/pottery/requests/:id - Customer edits own request while status is 'requested'
export async function updatePotteryRequest(req, res) {
  try {
    const { id } = req.params;
    const { potteryItemId, glazeId, quantity, neededByDate, notes } = req.body;

    const request = await PotteryRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Pottery request not found.' });
    }

    // Return 404 when a customer tries to access another customer's record
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Pottery request not found.' });
    }

    // Rule: Customers can edit only while status is 'requested'
    if (request.status !== 'requested') {
      return res.status(400).json({ error: `Cannot edit a request with status "${request.status}". Only "requested" status may be modified.` });
    }

    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 12) {
        return res.status(400).json({ error: 'Quantity must be an integer between 1 and 12.' });
      }
      request.quantity = qty;
    }

    if (neededByDate) {
      const diffDays = getDaysDifferenceFromToday(neededByDate);
      if (diffDays === null || diffDays < 14) {
        return res.status(400).json({ error: 'Needed-by date must be at least 14 days away.' });
      }
      request.neededByDate = neededByDate;
    }

    if (potteryItemId) {
      const item = await PotteryItem.findOne({ id: potteryItemId });
      if (!item) return res.status(400).json({ error: 'Invalid pottery item.' });
      request.potteryItemId = item.id;
      request.potteryItemName = item.name;
    }

    if (glazeId) {
      const glaze = await Glaze.findOne({ id: glazeId });
      if (!glaze) return res.status(400).json({ error: 'Invalid glaze.' });
      request.glazeId = glaze.id;
      request.glazeName = glaze.name;
    }

    if (notes !== undefined) {
      request.notes = notes.trim();
    }

    await request.save();
    return res.status(200).json({ message: 'Pottery request updated successfully', request });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update pottery request: ' + err.message });
  }
}

// POST /api/pottery/requests/:id/cancel - Customer cancels own request while status is 'requested'
export async function cancelPotteryRequest(req, res) {
  try {
    const { id } = req.params;

    const request = await PotteryRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Pottery request not found.' });
    }

    // Return 404 when a customer tries to access another customer's record
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Pottery request not found.' });
    }

    // Rule: Customers can cancel only while status is 'requested'
    if (request.status !== 'requested') {
      return res.status(400).json({ error: `Cannot cancel a request that is already "${request.status}".` });
    }

    request.status = 'cancelled';
    await request.save();

    return res.status(200).json({ message: 'Pottery request cancelled successfully.', request });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel pottery request: ' + err.message });
  }
}

// PATCH /api/pottery/requests/:id/status - Admin accepts or declines a request
export async function updatePotteryRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "accepted" or "declined".' });
    }

    const request = await PotteryRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Pottery request not found.' });
    }

    if (request.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update a request that has been cancelled by the customer.' });
    }

    request.status = status;
    await request.save();

    return res.status(200).json({ message: `Pottery request ${status} successfully.`, request });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update status: ' + err.message });
  }
}
