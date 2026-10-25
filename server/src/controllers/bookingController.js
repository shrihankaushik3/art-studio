import WallBooking from '../models/WallBooking.js';
import StudioConfig from '../models/StudioConfig.js';

// Helper to calculate days between today and a date string (YYYY-MM-DD)
function getDaysDifferenceFromToday(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString + 'T00:00:00');
  if (isNaN(targetDate.getTime())) return null;
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// POST /api/bookings - Customer creates a wall booking
export async function createBooking(req, res) {
  try {
    const { date, areaSqFt, address, notes } = req.body;

    if (!date || areaSqFt === undefined || !address) {
      return res.status(400).json({ error: 'Date, wall area, and address are required.' });
    }

    // 1. Date validation: 7–90 days in the future
    const diffDays = getDaysDifferenceFromToday(date);
    if (diffDays === null) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    if (diffDays < 7 || diffDays > 90) {
      return res.status(400).json({
        error: `Booking date must be between 7 and 90 days in the future (requested date is ${diffDays} day(s) away).`
      });
    }

    // 2. Wall area validation: 10–500 sq ft
    const area = Number(areaSqFt);
    if (isNaN(area) || area < 10 || area > 500) {
      return res.status(400).json({ error: 'Wall area must be between 10 and 500 square feet.' });
    }

    // 3. Address validation
    if (!address.trim()) {
      return res.status(400).json({ error: 'A valid service address is required.' });
    }

    // 4. Rate and price calculation
    const config = await StudioConfig.findOne({ key: 'default' });
    const ratePerSqFt = config ? config.muralRatePerSqFt : 150;
    const price = Math.round(area * ratePerSqFt);

    // 5. Check if date already has an active booking (requested or confirmed)
    const existingActive = await WallBooking.findOne({
      date,
      status: { $in: ['requested', 'confirmed'] }
    });

    if (existingActive) {
      return res.status(409).json({ error: `The date ${date} is already booked. Please choose another date.` });
    }

    // 6. Create booking with database constraint safety
    try {
      const booking = await WallBooking.create({
        customer: req.user._id,
        customerEmail: req.user.email,
        date,
        areaSqFt: area,
        ratePerSqFt,
        price,
        address: address.trim(),
        notes: notes ? notes.trim() : '',
        status: 'requested'
      });

      return res.status(201).json({
        message: 'Wall mural booking submitted successfully!',
        booking
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        return res.status(409).json({ error: `The date ${date} was just booked by another client.` });
      }
      throw dbErr;
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create booking: ' + err.message });
  }
}

// GET /api/bookings/my - Customer views own bookings
export async function getMyBookings(req, res) {
  try {
    const bookings = await WallBooking.find({ customer: req.user._id }).sort({ date: 1 });
    return res.status(200).json({ bookings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch customer bookings.' });
  }
}

// GET /api/bookings/all - Admin views all bookings
export async function getAllBookings(req, res) {
  try {
    const bookings = await WallBooking.find().sort({ date: 1 });
    return res.status(200).json({ bookings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch all bookings.' });
  }
}

// POST /api/bookings/:id/cancel - Customer cancels own booking (allowed until 3 days before date)
export async function cancelBooking(req, res) {
  try {
    const { id } = req.params;
    const booking = await WallBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Return 404 when a customer tries to access another customer's record
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }

    if (booking.status === 'declined') {
      return res.status(400).json({ error: 'Booking has already been declined.' });
    }

    // Rule: Customer can cancel their own booking until 3 days before the date
    const diffDays = getDaysDifferenceFromToday(booking.date);
    if (diffDays !== null && diffDays < 3) {
      return res.status(400).json({
        error: `Cancellation window closed. Bookings can only be cancelled at least 3 days before the scheduled date (${diffDays} day(s) remaining).`
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    return res.status(200).json({ message: 'Booking cancelled successfully. The date is now released.', booking });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel booking: ' + err.message });
  }
}

// PATCH /api/bookings/:id/status - Admin confirms or declines a booking
export async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['confirmed', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "confirmed" or "declined".' });
    }

    const booking = await WallBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update a booking that has been cancelled by the customer.' });
    }

    booking.status = status;
    await booking.save();

    return res.status(200).json({ message: `Booking ${status} successfully.`, booking });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update booking status: ' + err.message });
  }
}
