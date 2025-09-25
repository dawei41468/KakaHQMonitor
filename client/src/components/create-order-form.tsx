import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CreateOrderFormProps {
  onOrderCreated: () => void;
}

export function CreateOrderForm({ onOrderCreated }: CreateOrderFormProps) {
  const { t } = useTranslation();
  const [dealer, setDealer] = React.useState("");
  const [totalValue, setTotalValue] = React.useState("");

  const mutation = useMutation({
    mutationFn: (newOrder: { dealerId: string; totalValue: number; status: string }) => {
      return apiRequest("POST", "/api/orders", newOrder);
    },
    onSuccess: () => {
      onOrderCreated();
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      dealerId: dealer,
      totalValue: parseFloat(totalValue),
      status: "received",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{t('orders.createOrder')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('orders.createOrder')}</DialogTitle>
          <DialogDescription>
            {t('orders.createNewOrderDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dealer" className="text-right">
              Dealer
            </Label>
            <Input
              id="dealer"
              value={dealer}
              onChange={(e) => setDealer(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="totalValue" className="text-right">
              Total Value
            </Label>
            <Input
              id="totalValue"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            {t('common.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}