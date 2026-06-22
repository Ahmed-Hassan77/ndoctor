"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CreditCard,
  Smartphone,
  Receipt,
  Check,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import {
  createMockPaymentTransaction,
  completeMockPayment,
  failMockPayment,
} from "@/actions/payments";
import { useLocale } from "@/components/locale-provider";

function TestCardHelper() {
  const { t } = useLocale();
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-2">
      <p className="font-medium text-foreground text-xs uppercase tracking-wide text-primary">
        {t("checkout.demoCards")}
      </p>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted-foreground shrink-0">{t("checkout.successCard")}:</span>
          <code className="font-mono text-xs sm:text-sm text-primary bg-muted px-2 py-1 rounded whitespace-nowrap break-all">
            4242 4242 4242 4242
          </code>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted-foreground shrink-0">{t("checkout.failureCard")}:</span>
          <code className="font-mono text-xs sm:text-sm text-destructive bg-muted px-2 py-1 rounded whitespace-nowrap break-all">
            4000 0000 0000 0002
          </code>
        </div>
      </div>
    </div>
  );
}

export function CheckoutClient({ appointment }) {
  const { t, dir } = useLocale();
  const router = useRouter();

  const PAYMENT_METHODS = [
    {
      id: "CARD",
      label: t("checkout.card"),
      description: t("checkout.cardDesc"),
      icon: CreditCard,
    },
    {
      id: "MOBILE_WALLET",
      label: t("checkout.wallet"),
      description: t("checkout.walletDesc"),
      icon: Smartphone,
    },
    {
      id: "FAWRY_REFERENCE",
      label: t("checkout.fawry"),
      description: t("checkout.fawryDesc"),
      icon: Receipt,
    },
  ];
  const [method, setMethod] = useState("CARD");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [phone, setPhone] = useState("");
  const [fawryRef, setFawryRef] = useState(
    appointment.paymentTransactions?.find((t) => t.providerReference)
      ?.providerReference ?? ""
  );
  const [fawryLoading, setFawryLoading] = useState(false);

  const { loading: payLoading, fn: payFn, data: payData } = useFetch(
    completeMockPayment
  );
  const { loading: failLoading, fn: failFn } = useFetch(failMockPayment);
  const { fn: createTxn } = useFetch(createMockPaymentTransaction);

  const busy = payLoading || failLoading || fawryLoading;

  const buildBaseForm = () => {
    const fd = new FormData();
    fd.append("appointmentId", appointment.id);
    fd.append("method", method);
    return fd;
  };

  const ensureFawryPending = async () => {
    if (fawryRef) return;
    setFawryLoading(true);
    const fd = buildBaseForm();
    fd.set("method", "FAWRY_REFERENCE");
    const res = await createTxn(fd);
    setFawryLoading(false);
    if (res?.success && res.transaction?.providerReference) {
      setFawryRef(res.transaction.providerReference);
    }
  };

  const selectMethod = (id) => {
    setMethod(id);
    if (id === "FAWRY_REFERENCE") {
      ensureFawryPending();
    }
  };

  const handleCardPay = async () => {
    if (!cardholderName.trim() || !cardNumber.trim()) {
      toast.error(t("checkout.validationCard"));
      return;
    }
    const fd = buildBaseForm();
    fd.append("cardholderName", cardholderName);
    fd.append("cardNumber", cardNumber);
    fd.append("expiry", expiry);
    fd.append("cvv", cvv);
    await payFn(fd);
  };

  const handleWalletPay = async () => {
    const fd = buildBaseForm();
    fd.append("phone", phone);
    await payFn(fd);
  };

  const handleFawrySimulatePaid = async () => {
    if (!fawryRef) await ensureFawryPending();
    const fd = buildBaseForm();
    fd.append("simulateOutcome", "success");
    await payFn(fd);
  };

  const handleFawryFail = async () => {
    const fd = buildBaseForm();
    fd.append("simulateOutcome", "fail");
    await failFn(fd);
  };

  const handleFawryExpire = async () => {
    const fd = buildBaseForm();
    fd.append("simulateOutcome", "expire");
    await failFn(fd);
  };

  const copyFawryRef = () => {
    if (!fawryRef) return;
    navigator.clipboard.writeText(fawryRef);
    toast.success(t("checkout.refCopied"));
  };

  useEffect(() => {
    if (payData?.success === true) {
      toast.success(t("checkout.paymentSuccess"));
      router.push("/appointments");
      router.refresh();
    }
  }, [payData, router]);

  return (
    <Card dir={dir} className="border-border w-full min-w-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">
          {t("checkout.paymentMethod")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("checkout.chooseMethod")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 w-full min-w-0">
        {/* Method selector — full width grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full"
          role="radiogroup"
          aria-label="Payment method"
        >
          {PAYMENT_METHODS.map((m) => {
            const Icon = m.icon;
            const selected = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectMethod(m.id)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all w-full min-w-0",
                  "hover:border-primary/40 hover:bg-muted/30",
                  selected
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-muted/10"
                )}
              >
                {selected ? (
                  <span className="absolute top-3 end-3 text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                ) : null}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="font-medium text-foreground text-sm pr-6">
                  {m.label}
                </span>
                <span className="text-xs text-muted-foreground leading-snug">
                  {m.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Payment panels — full width */}
        <div className="w-full min-w-0 border-t border-border/50 pt-6">
          {method === "CARD" && (
            <div className="space-y-5 w-full max-w-none">
              <TestCardHelper />
              <div className="space-y-2 w-full">
                <Label htmlFor="cardholder">{t("checkout.cardholder")}</Label>
                <Input
                  id="cardholder"
                  className="w-full"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder={t("checkout.cardholderPlaceholder")}
                  autoComplete="cc-name"
                />
              </div>
              <div className="space-y-2 w-full">
                <Label htmlFor="cardnumber">{t("checkout.cardNumber")}</Label>
                <Input
                  id="cardnumber"
                  className="w-full font-mono tracking-wide"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  autoComplete="cc-number"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="expiry">{t("checkout.expiry")}</Label>
                  <Input
                    id="expiry"
                    className="w-full"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder={t("checkout.expiryPlaceholder")}
                    autoComplete="cc-exp"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="cvv">{t("checkout.cvv")}</Label>
                  <Input
                    id="cvv"
                    className="w-full"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder={t("checkout.cvvPlaceholder")}
                    autoComplete="cc-csc"
                    maxLength={4}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full  mt-2"
                disabled={busy}
                onClick={handleCardPay}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("checkout.processing")}
                  </>
                ) : (
                  t("common.payNow")
                )}
              </Button>
            </div>
          )}

          {method === "MOBILE_WALLET" && (
            <div className="space-y-5 w-full max-w-none">
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/25 border border-border/50 p-3">
                {t("checkout.walletDemoHint", { example: "01012345678" })}
              </p>
              <div className="space-y-2 w-full">
                <Label htmlFor="phone">{t("checkout.phone")}</Label>
                <Input
                  id="phone"
                  className="w-full font-mono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("checkout.walletPhonePlaceholder")}
                  type="tel"
                  autoComplete="tel"
                />
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full "
                disabled={busy}
                onClick={handleWalletPay}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("checkout.processing")}
                  </>
                ) : (
                  t("checkout.payWithWallet")
                )}
              </Button>
            </div>
          )}

          {method === "FAWRY_REFERENCE" && (
            <div className="space-y-5 w-full max-w-none">
              <div className="home-card-gradient rounded-2xl p-5 space-y-4 ring-1 ring-primary/10">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("checkout.fawryPayTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("checkout.fawryPayDesc")}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md bg-black/25 border border-primary/20 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("checkout.referenceCode")}
                    </p>
                    <p className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-primary break-all sm:whitespace-nowrap">
                      {fawryLoading
                        ? t("checkout.generating")
                        : fawryRef || t("checkout.selectFawry")}
                    </p>
                  </div>
                  {fawryRef ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-primary/25/40"
                      onClick={copyFawryRef}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {t("common.copy")}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <Button
                  type="button"
                  size="lg"
                  className="w-full  sm:col-span-1"
                  disabled={busy}
                  onClick={handleFawrySimulatePaid}
                >
                  {t("checkout.simulatePaid")}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={handleFawryFail}
                >
                  {t("checkout.simulateFailed")}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={handleFawryExpire}
                >
                  {t("checkout.simulateExpired")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
