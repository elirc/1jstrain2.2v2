"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";

const STEPS = ["Address", "Shipping", "Payment", "Review"];

export default function CheckoutPageView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    address: {
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      region: "CA",
      postalCode: "",
      country: "US",
      phone: ""
    },
    shippingBySeller: {},
    payment: {
      method: "card",
      cardName: "",
      cardLast4: "4242"
    },
    discountCode: ""
  });

  useEffect(() => {
    apiRequest("/api/cart")
      .then((data) => {
        setCart(data.cart);
        const shippingDefaults = Object.fromEntries(
          data.cart.sellers.map((seller) => [seller.sellerId, 7.99])
        );
        setForm((current) => ({ ...current, shippingBySeller: shippingDefaults }));
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const totals = useMemo(() => {
    if (!cart) {
      return { subtotal: 0, shipping: 0, tax: 0, total: 0 };
    }

    const subtotal = cart.subtotal;
    const shipping = Object.values(form.shippingBySeller || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const regionTaxRate = ["CA", "NY", "TX"].includes(form.address.region) ? 0.0875 : 0.06;
    const tax = Number(((subtotal + shipping) * regionTaxRate).toFixed(2));
    const discount = form.discountCode.trim().toUpperCase() === "WELCOME10" ? Number((subtotal * 0.1).toFixed(2)) : 0;
    const total = subtotal + shipping + tax - discount;

    return { subtotal, shipping, tax, discount, total };
  }, [cart, form]);

  function updateAddress(field, value) {
    setForm((current) => ({
      ...current,
      address: {
        ...current.address,
        [field]: value
      }
    }));
  }

  async function placeOrder() {
    try {
      setSubmitting(true);
      setError("");
      const result = await apiRequest("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          address: form.address,
          shippingBySeller: form.shippingBySeller,
          payment: form.payment,
          discountCode: form.discountCode
        })
      });

      setSuccess(`Order successful. Created order IDs: ${result.checkout.orderIds.join(", ")}`);
      setTimeout(() => {
        router.push("/orders");
      }, 1200);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart) {
    return <div className="card">Loading checkout...</div>;
  }

  return (
    <section className="stack">
      <div>
        <h1>Checkout</h1>
        <p>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="card stack">
        {step === 0 ? (
          <div className="cols-2">
            <div>
              <label>Full name</label>
              <input value={form.address.fullName} onChange={(event) => updateAddress("fullName", event.target.value)} />
            </div>
            <div>
              <label>Phone</label>
              <input value={form.address.phone} onChange={(event) => updateAddress("phone", event.target.value)} />
            </div>
            <div>
              <label>Address line 1</label>
              <input value={form.address.line1} onChange={(event) => updateAddress("line1", event.target.value)} />
            </div>
            <div>
              <label>Address line 2</label>
              <input value={form.address.line2} onChange={(event) => updateAddress("line2", event.target.value)} />
            </div>
            <div>
              <label>City</label>
              <input value={form.address.city} onChange={(event) => updateAddress("city", event.target.value)} />
            </div>
            <div>
              <label>Region</label>
              <input value={form.address.region} onChange={(event) => updateAddress("region", event.target.value)} />
            </div>
            <div>
              <label>Postal code</label>
              <input value={form.address.postalCode} onChange={(event) => updateAddress("postalCode", event.target.value)} />
            </div>
            <div>
              <label>Country</label>
              <input value={form.address.country} onChange={(event) => updateAddress("country", event.target.value)} />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="stack">
            {cart.sellers.map((seller) => (
              <div key={seller.sellerId} className="card">
                <div className="spread">
                  <h3>{seller.sellerName}</h3>
                  <span>${seller.subtotal.toFixed(2)} subtotal</span>
                </div>
                <label>Shipping charge</label>
                <select
                  value={form.shippingBySeller[seller.sellerId] || 7.99}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    shippingBySeller: {
                      ...current.shippingBySeller,
                      [seller.sellerId]: Number(event.target.value)
                    }
                  }))}
                >
                  <option value="4.99">Economy (5-7 days) - $4.99</option>
                  <option value="7.99">Standard (3-5 days) - $7.99</option>
                  <option value="14.99">Express (1-2 days) - $14.99</option>
                </select>
              </div>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="cols-2">
            <div>
              <label>Payment method</label>
              <select
                value={form.payment.method}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  payment: { ...current.payment, method: event.target.value }
                }))}
              >
                <option value="card">Card</option>
                <option value="wallet">Wallet</option>
                <option value="bank">Bank transfer</option>
              </select>
            </div>
            <div>
              <label>Name on payment</label>
              <input
                value={form.payment.cardName}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  payment: { ...current.payment, cardName: event.target.value }
                }))}
              />
            </div>
            <div>
              <label>Discount code</label>
              <input
                placeholder="WELCOME10"
                value={form.discountCode}
                onChange={(event) => setForm((current) => ({ ...current, discountCode: event.target.value }))}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="stack">
            <div className="spread"><span>Subtotal</span><strong>${totals.subtotal.toFixed(2)}</strong></div>
            <div className="spread"><span>Shipping</span><strong>${totals.shipping.toFixed(2)}</strong></div>
            <div className="spread"><span>Tax</span><strong>${totals.tax.toFixed(2)}</strong></div>
            <div className="spread"><span>Discount</span><strong>-${(totals.discount || 0).toFixed(2)}</strong></div>
            <div className="spread"><h3>Total</h3><h3>${totals.total.toFixed(2)}</h3></div>
            <button type="button" onClick={placeOrder} disabled={submitting}>
              {submitting ? "Processing..." : "Place Order"}
            </button>
          </div>
        ) : null}

        <div className="row">
          <button type="button" className="button ghost" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
            Back
          </button>
          <button type="button" disabled={step === STEPS.length - 1} onClick={() => setStep((current) => current + 1)}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

