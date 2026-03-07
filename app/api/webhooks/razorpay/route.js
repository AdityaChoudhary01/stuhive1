import crypto from "crypto";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Note from "@/lib/models/Note";
import { createNotification } from "@/actions/notification.actions"; // Assuming you have this

export async function POST(req) {
  try {
    // 1. Get the raw body as text for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Webhook secret is missing in env variables.");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // 2. Verify the cryptographic signature to ensure this is ACTUALLY from Razorpay
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("🚨 Invalid Razorpay Webhook Signature Detected!");
      return new Response("Invalid signature", { status: 400 });
    }

    // 3. Parse the JSON body now that we know it's secure
    const event = JSON.parse(bodyText);

    // 4. We only care when a payment is successfully captured
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      
      // Razorpay allows you to pass custom 'notes' when creating an order. 
      // We extract them here to know WHO bought WHAT.
      const { noteId, buyerId } = payment.notes || {};

      if (!noteId || !buyerId) {
        console.error("Missing metadata (notes) in Razorpay payment payload");
        return new Response("OK", { status: 200 }); // Still return 200 so Razorpay stops retrying
      }

      await connectDB();

      // Fetch the buyer and the note to get the seller's details
      const [buyer, note] = await Promise.all([
        User.findById(buyerId),
        Note.findById(noteId).populate("user")
      ]);

      if (!buyer || !note) {
        return new Response("User or Note not found", { status: 404 });
      }

      // 5. IDEMPOTENCY CHECK: Prevent double-crediting if webhook fires twice!
      if (buyer.purchasedNotes.includes(note._id)) {
        console.log("Webhook fired for already processed payment. Ignoring.");
        return new Response("OK", { status: 200 });
      }

      // 6. Grant the buyer access to the note
      buyer.purchasedNotes.push(note._id);
      await buyer.save();

      // 7. Calculate payout for the creator (e.g., 80% to creator, 20% platform fee)
      // payment.amount is in paise (e.g., 50000 = ₹500).
      const amountInRupees = payment.amount / 100;
      const creatorEarnings = amountInRupees * 0.80; // 80% cut
      
      // 8. Add money to the creator's wallet
      const seller = await User.findById(note.user._id);
      if (seller) {
        seller.walletBalance = (seller.walletBalance || 0) + creatorEarnings;
        await seller.save();

        // Notify Seller
        await createNotification({
          recipientId: seller._id,
          type: 'SYSTEM',
          message: `Cha-ching! Someone just bought "${note.title}". ₹${creatorEarnings.toFixed(2)} has been added to your wallet.`,
          link: `/wallet`
        });
      }

      // Notify Buyer
      await createNotification({
        recipientId: buyer._id,
        type: 'SYSTEM',
        message: `Payment successful! You now have lifetime access to "${note.title}".`,
        link: `/notes/${note.slug}`
      });

      console.log(`✅ Payment processed successfully via Webhook: User ${buyerId} bought Note ${noteId}`);
    }

    // Razorpay requires a 2xx response, otherwise it will keep retrying the webhook for 24 hours.
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}