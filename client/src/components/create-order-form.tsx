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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ContractItem {
  region: string;
  category: string;
  productName: string;
  productDetail: string;
  specification: string;
  colorType: string;
  colorCode: string;
  quantity: number;
  unit: string;
  retailPrice: number;
  retailTotal: number;
  dealPrice: number;
  dealTotal: number;
  remarks?: string;
}

interface CreateOrderFormProps {
  onOrderCreated: () => void;
}

export function CreateOrderForm({ onOrderCreated }: CreateOrderFormProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("basic");
  const [docxPreview, setDocxPreview] = React.useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Fetch dealers for buyer selection
  const { data: dealers = [] } = useQuery<any[]>({
    queryKey: ['/api/dealers'],
  });

  // Basic info state
  const [orderNumber, setOrderNumber] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [signingDate, setSigningDate] = React.useState("");
  const [designer, setDesigner] = React.useState("");
  const [salesRep, setSalesRep] = React.useState("");
  const [estimatedDelivery, setEstimatedDelivery] = React.useState("");

  // Buyer info state
  const [dealerId, setDealerId] = React.useState("");
  const [buyerCompanyName, setBuyerCompanyName] = React.useState("");
  const [buyerAddress, setBuyerAddress] = React.useState("");
  const [buyerPhone, setBuyerPhone] = React.useState("");
  const [buyerTaxNumber, setBuyerTaxNumber] = React.useState("");

  // Contract items state
  const [contractItems, setContractItems] = React.useState<ContractItem[]>([
    {
      region: "",
      category: "",
      productName: "",
      productDetail: "",
      specification: "",
      colorType: "",
      colorCode: "",
      quantity: 0,
      unit: "",
      retailPrice: 0,
      retailTotal: 0,
      dealPrice: 0,
      dealTotal: 0,
      remarks: ""
    }
  ]);

  const previewMutation = useMutation({
    mutationFn: async (contractData: any) => {
      const response = await apiRequest("POST", "/api/orders/preview", contractData);
      return response.json();
    },
    onSuccess: (data) => {
      setDocxPreview(data.docxData);
      setPdfPreview(data.pdfPreview);
      setActiveTab("preview");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (data) => {
      // Download DOCX if available
      if (data.docxData) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${data.docxData}`;
        link.download = `${orderNumber}_contract.docx`;
        link.click();
      }
      setIsOpen(false);
      onOrderCreated();
    },
  });

  const handlePreview = () => {
    // Validate required fields
    if (!orderNumber.trim()) {
      alert('Contract number is required');
      return;
    }
    if (!dealerId) {
      alert('Please select a dealer');
      return;
    }
    if (contractItems.length === 0) {
      alert('At least one contract item is required');
      return;
    }

    // Validate contract items
    const validItems = contractItems.filter(item =>
      item.productName.trim() &&
      item.quantity > 0 &&
      item.unit.trim()
    );

    if (validItems.length === 0) {
      alert('Please add at least one valid contract item with product name, quantity, and unit');
      return;
    }

    const contractData = {
      contractNumber: orderNumber,
      projectName,
      signingDate: signingDate ? new Date(signingDate) : new Date(),
      designer,
      salesRep,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : new Date(),
      buyerCompanyName,
      buyerAddress: buyerAddress || undefined,
      buyerPhone: buyerPhone || undefined,
      buyerTaxNumber: buyerTaxNumber || undefined,
      items: validItems.map(item => ({
        ...item,
        color: item.colorType + " " + item.colorCode
      })),
      totalAmount: validItems.reduce((sum, item) => sum + item.dealTotal, 0)
    };

    previewMutation.mutate(contractData);
  };

  const handleSubmit = () => {
    if (!dealerId) {
      alert('Please select a dealer');
      return;
    }

    const validItems = contractItems.filter(item =>
      item.productName.trim() &&
      item.quantity > 0 &&
      item.unit.trim()
    );

    if (validItems.length === 0) {
      alert('Please add at least one valid contract item');
      return;
    }

    const totalValue = validItems.reduce((sum, item) => sum + item.dealTotal, 0);

    const orderData = {
      dealerId,
      orderNumber,
      status: "received",
      items: validItems.map(item => ({
        item: item.productName,
        quantity: item.quantity
      })),
      totalValue: totalValue.toFixed(2),
      projectName,
      signingDate: signingDate ? new Date(signingDate) : null,
      designer,
      salesRep,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      buyerCompanyName,
      buyerAddress: buyerAddress || null,
      buyerPhone: buyerPhone || null,
      buyerTaxNumber: buyerTaxNumber || null,
      contractItems: validItems.map(item => ({
        ...item,
        color: item.colorType + " " + item.colorCode
      }))
    };

    submitMutation.mutate(orderData);
  };

  const addContractItem = () => {
    setContractItems([...contractItems, {
      region: "",
      category: "",
      productName: "",
      productDetail: "",
      specification: "",
      colorType: "",
      colorCode: "",
      quantity: 0,
      unit: "",
      retailPrice: 0,
      retailTotal: 0,
      dealPrice: 0,
      dealTotal: 0,
      remarks: ""
    }]);
  };

  const updateContractItem = (index: number, field: keyof ContractItem, value: any) => {
    const updated = [...contractItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate totals
    if (field === 'quantity' || field === 'retailPrice') {
      updated[index].retailTotal = updated[index].quantity * updated[index].retailPrice;
    }
    if (field === 'quantity' || field === 'dealPrice') {
      updated[index].dealTotal = updated[index].quantity * updated[index].dealPrice;
    }

    setContractItems(updated);
  };

  const removeContractItem = (index: number) => {
    setContractItems(contractItems.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t('orders.createOrder')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('orders.createOrder')}</DialogTitle>
          <DialogDescription>
            {t('orders.createNewOrderDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t('createOrder.basicInfo')}</TabsTrigger>
            <TabsTrigger value="items">{t('createOrder.contractItems')}</TabsTrigger>
            <TabsTrigger value="preview">{t('createOrder.previewSubmit')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="orderNumber">
                  {t('createOrder.contractNumber')}
                </Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., CD20250001"
                />
              </div>
              <div>
                <Label htmlFor="projectName">
                  {t('createOrder.projectName')}
                </Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signingDate">
                  {t('createOrder.signingDate')}
                </Label>
                <Input
                  id="signingDate"
                  type="date"
                  value={signingDate}
                  onChange={(e) => setSigningDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="estimatedDelivery">
                  {t('createOrder.estimatedShipDate')}
                </Label>
                <Input
                  id="estimatedDelivery"
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="designer">
                  {t('createOrder.designer')}
                </Label>
                <Input
                  id="designer"
                  value={designer}
                  onChange={(e) => setDesigner(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="salesRep">
                  {t('createOrder.salesRep')}
                </Label>
                <Input
                  id="salesRep"
                  value={salesRep}
                  onChange={(e) => setSalesRep(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="buyerCompanyName">
                  {t('createOrder.buyerCompany')}
                </Label>
                <Select value={dealerId} onValueChange={(value) => {
                  const dealer = dealers.find((d: any) => d.id === value);
                  setDealerId(value);
                  setBuyerCompanyName(dealer?.name || "");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('createOrder.selectDealer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {dealers.map((dealer: any) => (
                      <SelectItem key={dealer.id} value={dealer.id}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setActiveTab("items")}>
                {t('createOrder.nextAddItems')}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <div className="space-y-4">
              {contractItems.map((item, index) => (
                <div key={index} className="border p-4 rounded">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>{t('createOrder.region')}</Label>
                      <Select value={item.region} onValueChange={(value) => updateContractItem(index, 'region', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('createOrder.selectRegion')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="墙面">{t('createOrder.wall')}</SelectItem>
                          <SelectItem value="阳台">{t('createOrder.balcony')}</SelectItem>
                          <SelectItem value="地面">{t('createOrder.floor')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('createOrder.category')}</Label>
                      <Select value={item.category} onValueChange={(value) => updateContractItem(index, 'category', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('createOrder.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="墙板">{t('createOrder.wallPanel')}</SelectItem>
                          <SelectItem value="地板">{t('createOrder.flooring')}</SelectItem>
                          <SelectItem value="花箱">{t('createOrder.flowerBox')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('createOrder.productDetail')}</Label>
                      <Select value={item.productDetail} onValueChange={(value) => updateContractItem(index, 'productDetail', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('createOrder.selectProductDetail')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="条发">条发</SelectItem>
                          <SelectItem value="条状">条状</SelectItem>
                          <SelectItem value="平面">平面</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('createOrder.productName')}</Label>
                      <Input
                        value={item.productName}
                        onChange={(e) => updateContractItem(index, 'productName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('createOrder.specification')}</Label>
                      <Input
                        value={item.specification}
                        onChange={(e) => updateContractItem(index, 'specification', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('createOrder.color')}</Label>
                      <div className="flex gap-2">
                        <div className="w-1/3">
                          <Select value={item.colorType} onValueChange={(value) => updateContractItem(index, 'colorType', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="单面">单面</SelectItem>
                              <SelectItem value="双面">双面</SelectItem>
                              <SelectItem value="裸板">裸板</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-2/3">
                          <Input
                            value={item.colorCode}
                            onChange={(e) => updateContractItem(index, 'colorCode', e.target.value)}
                            placeholder="颜色代码"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>{t('createOrder.quantity')}</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateContractItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('createOrder.unit')}</Label>
                      <Select value={item.unit} onValueChange={(value) => updateContractItem(index, 'unit', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('createOrder.selectUnit')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="㎡">{t('createOrder.squareMeter')}</SelectItem>
                          <SelectItem value="米">{t('createOrder.meter')}</SelectItem>
                          <SelectItem value="条">{t('createOrder.piece')}</SelectItem>
                          <SelectItem value="个">{t('createOrder.item')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('createOrder.dealPrice')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.dealPrice}
                        onChange={(e) => updateContractItem(index, 'dealPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label>{t('createOrder.remarks')}</Label>
                    <Input
                      value={item.remarks}
                      onChange={(e) => updateContractItem(index, 'remarks', e.target.value)}
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {t('createOrder.dealTotal', { amount: item.dealTotal.toFixed(2) })}
                  </div>
                  {contractItems.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeContractItem(index)}
                      className="mt-2"
                    >
                      {t('createOrder.removeItem')}
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={addContractItem} variant="outline">
                {t('createOrder.addAnotherItem')}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveTab("basic")}>
                {t('createOrder.back')}
              </Button>
              <Button onClick={handlePreview}>
                {t('createOrder.previewContract')}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {pdfPreview && (
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">{t('createOrder.contractPreview')}</h3>
                <iframe
                  src={`data:application/pdf;base64,${pdfPreview}`}
                  className="w-full h-[80vh] border"
                  title={t('createOrder.contractPreview')}
                />
              </div>
            )}
            {docxPreview && (
              <div className="border rounded p-4 mt-4">
                <div className="flex items-center justify-between">
                  <p>{t('createOrder.docxDownloadReady')}</p>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxPreview}`;
                      link.download = `${orderNumber}_contract.docx`;
                      link.click();
                    }}
                  >
                    {t('createOrder.downloadDocx')}
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveTab("items")}>
                {t('createOrder.backToEdit')}
              </Button>
              <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? t('createOrder.creatingOrder') : t('createOrder.createOrderDownload')}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}