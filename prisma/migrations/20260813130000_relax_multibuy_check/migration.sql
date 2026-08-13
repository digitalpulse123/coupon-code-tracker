-- Relax the multibuy check so a coupon can be marked as a multibuy offer
-- without capturing specific quantities. When both quantities are present the
-- paid quantity must still be less than the deal quantity. With null
-- quantities the CHECK evaluates to NULL, which passes (SPEC section 5).
ALTER TABLE "coupon" DROP CONSTRAINT "coupon_multibuy_qty_check";

ALTER TABLE "coupon" ADD CONSTRAINT "coupon_multibuy_qty_check"
    CHECK ("offer_type" <> 'multibuy' OR "multibuy_pay_qty" < "multibuy_qty");
