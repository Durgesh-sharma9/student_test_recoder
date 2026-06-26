import mongoose from 'mongoose';

const BILLING_CYCLES = ['monthly', 'quarterly', 'half_yearly', 'yearly'];
const PLAN_TYPES_V2 = ['trial', 'basic', 'standard', 'premium'];

const defaultDurationByCycle = (cycle) => {
  if (cycle === 'quarterly') return 90;
  if (cycle === 'half_yearly') return 180;
  if (cycle === 'yearly') return 365;
  return 30;
};

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /**
     * Backward-compatible unique identifier.
     * Old data uses: "trial" | "basic" | "premium".
     * New subscription flow can use: "{planType}_{billingCycle}" (e.g. "premium_monthly").
     */
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },

    // New plan metadata (optional for old records)
    planType: { type: String, enum: PLAN_TYPES_V2, trim: true },
    billingCycle: { type: String, enum: BILLING_CYCLES, default: 'monthly' },

    durationDays: { type: Number, required: true, default: 30 },
    maxTeachers: { type: Number, default: 50 },
    maxStudents: { type: Number, default: 500 },

    // Pricing
    basePrice: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },

    /**
     * Backward-compatible "price".
     * We keep it in sync with `finalPrice` so existing UI/pages that show "price" keep working.
     */
    price: { type: Number, default: 0 },

    // Tax information stored with the plan (no separate Tax page)
    tax: {
      enabled: { type: Boolean, default: false },
      name: { type: String, trim: true },
      percentage: { type: Number, min: 0, max: 100, default: 0 },
      amount: { type: Number, default: 0 },
    },

    /**
     * Feature flags stored with the plan.
     * Stored as a Map so new features can be added without schema changes.
     * Missing key means "enabled" (backward compatible default).
     */
    features: { type: Map, of: Boolean, default: {} },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

planSchema.pre('validate', function syncDerivedFields(next) {
  try {
    // Derive planType/billingCycle from slug for old data and convenience
    if ((!this.planType || !this.billingCycle) && this.slug) {
      const slug = String(this.slug).toLowerCase();
      const parts = slug.split('_').filter(Boolean);

      const inferredPlanType = parts[0];
      const inferredCycle = parts[1];

      if (!this.planType && PLAN_TYPES_V2.includes(inferredPlanType)) {
        this.planType = inferredPlanType;
      }
      if (!this.billingCycle && BILLING_CYCLES.includes(inferredCycle)) {
        this.billingCycle = inferredCycle;
      }
    }

    if (!this.billingCycle) this.billingCycle = 'monthly';

    // Default duration from billing cycle if durationDays is missing/invalid
    if (!this.durationDays || Number(this.durationDays) <= 0) {
      this.durationDays = defaultDurationByCycle(this.billingCycle);
    }

    // Backward compatible: if basePrice not set but "price" provided, assume basePrice = price
    const base = Number.isFinite(Number(this.basePrice)) ? Number(this.basePrice) : 0;
    const legacyPrice = Number.isFinite(Number(this.price)) ? Number(this.price) : 0;
    if (!base && legacyPrice) this.basePrice = legacyPrice;

    const computedBase = Number.isFinite(Number(this.basePrice)) ? Number(this.basePrice) : 0;
    const taxEnabled = Boolean(this.tax?.enabled);
    const taxPct = Number.isFinite(Number(this.tax?.percentage)) ? Number(this.tax.percentage) : 0;

    const taxAmount = taxEnabled ? round2((computedBase * taxPct) / 100) : 0;
    this.tax = {
      enabled: taxEnabled,
      name: taxEnabled ? (this.tax?.name || 'GST') : undefined,
      percentage: taxEnabled ? taxPct : 0,
      amount: taxAmount,
    };

    const finalPrice = round2(computedBase + taxAmount);
    this.finalPrice = finalPrice;

    // Keep legacy price in sync with finalPrice
    this.price = finalPrice;

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Plan', planSchema);
