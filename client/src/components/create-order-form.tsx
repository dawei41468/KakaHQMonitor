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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ContractItem {
  region: string;
  category: string;
  productName: string;
  standardProductName: string;
  customProductName: string;
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
  order?: any;
  isDialog?: boolean;
}

const createEmptyContractItem = (): ContractItem => ({
  region: "",
  category: "",
  productName: "",
  standardProductName: "",
  customProductName: "",
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
  remarks: "",
});

export function CreateOrderForm({ onOrderCreated, order, isDialog = true }: CreateOrderFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("basic");
  const [docxPreview, setDocxPreview] = React.useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Fetch dealers for buyer selection
  const { data: dealers = [] } = useQuery<any[]>({
    queryKey: ['/api/dealers'],
  });

  // Fetch dynamic options
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('GET', '/api/categories').then(res => res.json()),
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => apiRequest('GET', '/api/regions').then(res => res.json()),
  });

  const { data: productDetails = [] } = useQuery({
    queryKey: ['product-details'],
    queryFn: () => apiRequest('GET', '/api/product-details').then(res => res.json()),
  });

  const { data: colorTypes = [] } = useQuery({
    queryKey: ['color-types'],
    queryFn: () => apiRequest('GET', '/api/color-types').then(res => res.json()),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiRequest('GET', '/api/products').then(res => res.json()),
  });

  const { data: allColors = [] } = useQuery({
    queryKey: ['colors'],
    queryFn: () => apiRequest('GET', '/api/colors').then(res => res.json()),
  });

  const { data: allUnits = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => apiRequest('GET', '/api/units').then(res => res.json()),
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
  const [contractItems, setContractItems] = React.useState<ContractItem[]>([createEmptyContractItem()]);

  // Attachments state
  const [attachments, setAttachments] = React.useState<File[]>([]);

  const resetForm = React.useCallback(() => {
    setOrderNumber("");
    setProjectName("");
    setSigningDate("");
    setDesigner("");
    setSalesRep("");
    setEstimatedDelivery("");
    setDealerId("");
    setBuyerCompanyName("");
    setBuyerAddress("");
    setBuyerPhone("");
    setBuyerTaxNumber("");
    setContractItems([createEmptyContractItem()]);
    setAttachments([]);
    setDocxPreview(null);
    setPdfPreview(null);
    setActiveTab("basic");
  }, []);

  const handleDialogOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    if (!order) {
      resetForm();
    } else if (!open) {
      setDocxPreview(null);
      setPdfPreview(null);
      setActiveTab("basic");
    }
  }, [order, resetForm]);

  React.useEffect(() => {
    if (order) {
      setOrderNumber(order.orderNumber || "");
      setProjectName(order.projectName || "");
      setSigningDate(order.signingDate ? new Date(order.signingDate).toISOString().split('T')[0] : "");
      setDesigner(order.designer || "");
      setSalesRep(order.salesRep || "");
      setEstimatedDelivery(order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split('T')[0] : "");
      setDealerId(order.dealerId || "");
      setBuyerCompanyName(order.buyerCompanyName || "");
      setBuyerAddress(order.buyerAddress || "");
      setBuyerPhone(order.buyerPhone || "");
      setBuyerTaxNumber(order.buyerTaxNumber || "");
      if (order.contractItems && Array.isArray(order.contractItems)) {
        setContractItems(order.contractItems.map((item: any) => {
          const isStandardProduct = allProducts.some((p: any) => p.name === item.productName);
          return {
            region: item.region || "",
            category: item.category || "",
            productName: item.productName || "",
            standardProductName: isStandardProduct ? item.productName : "",
            customProductName: isStandardProduct ? "" : item.productName,
            productDetail: item.productDetail || "",
            specification: item.specification || "",
            colorType: item.color ? item.color.split(" ")[0] : "",
            colorCode: item.color ? item.color.split(" ")[1] : "",
            quantity: item.quantity || 0,
            unit: item.unit || "",
            retailPrice: item.retailPrice || 0,
            retailTotal: item.retailTotal || 0,
            dealPrice: item.dealPrice || 0,
            dealTotal: item.dealTotal || 0,
            remarks: item.remarks || ""
          };
        }));
      }
      setDocxPreview(null);
      setPdfPreview(null);
      setActiveTab("basic");
      setIsOpen(true);
    } else {
      resetForm();
      setIsOpen(false);
    }
  }, [order, resetForm]);

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
      const method = order ? "PUT" : "POST";
      const url = order ? `/api/orders/${order.id}` : "/api/orders";
      const response = await apiRequest(method, url, orderData);
      return response.json();
    },
    onSuccess: (data) => {
      // Download DOCX if available and creating new order
      if (!order && data.docxData) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${data.docxData}`;
        link.download = `${orderNumber}_contract.docx`;
        link.click();
      }
      // Invalidate queries to trigger UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dealers'] });
      handleDialogOpenChange(false);
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

    const calculatedRetail = validItems.reduce((sum, item) => sum + item.retailTotal, 0);
    const calculatedDeal = validItems.reduce((sum, item) => sum + item.dealTotal, 0);

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
      retailTotalAmount: calculatedRetail,
      totalAmount: calculatedDeal
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

    const totalRetailAmount = validItems.reduce((sum, item) => sum + item.retailTotal, 0);
    const totalDealAmount = validItems.reduce((sum, item) => sum + item.dealTotal, 0);

    const orderData = {
      dealerId,
      orderNumber,
      status: "received",
      items: validItems.map(item => ({
        item: item.productName,
        quantity: item.quantity
      })),
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
      })),
      overallRetailTotal: totalRetailAmount,
      overallDealTotal: totalDealAmount,
    };

    submitMutation.mutate({ ...orderData, totalValue: totalDealAmount.toFixed(2) });
  };

  const addContractItem = () => {
    setContractItems([...contractItems, createEmptyContractItem()]);
  };

  const contractTotals = React.useMemo(() => {
    const retailTotal = contractItems.reduce((sum, item) => sum + (item.retailTotal || 0), 0);
    const dealTotal = contractItems.reduce((sum, item) => sum + (item.dealTotal || 0), 0);
    return { retailTotal, dealTotal };
  }, [contractItems]);

  const updateContractItem = (index: number, field: keyof ContractItem, value: any) => {
    const updated = [...contractItems];
    updated[index] = { ...updated[index], [field]: value };

    // Handle product name logic
    if (field === 'standardProductName') {
      const product = allProducts.find((p: any) => p.name === value);
      if (product) {
        updated[index].productName = value;
        updated[index].specification = product.defaultSpecification;
        updated[index].customProductName = '';
      }
    } else if (field === 'customProductName') {
      updated[index].productName = value;
      updated[index].standardProductName = '';
    }

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

  if (isDialog) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline">{t('orders.createOrder')}</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
             <DialogTitle>{order ? t('orders.editOrder') : t('orders.createOrder')}</DialogTitle>
             <DialogDescription>
               {order ? t('orders.editOrderDescription') : t('orders.createNewOrderDescription')}
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
                  placeholder="例如：CD20250001"
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
                    <SelectValue placeholder="选择经销商" />
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
              <div className="col-span-2">
                <Label htmlFor="attachments">Attachments</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.dwg"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAttachments(files);
                  }}
                />
                {attachments.length > 0 && (
                  <div className="mt-2">
                    <p>Selected files:</p>
                    <ul>
                      {attachments.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
              {contractItems.map((item, index) => {
                const filteredProducts = allProducts.filter((p: any) => !item.category || p.category?.name === item.category);
                const filteredUnits = allUnits;

                return (
                  <div key={index} className="border p-4 rounded">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>{t('createOrder.region')}</Label>
                        <Select value={item.region} onValueChange={(value) => updateContractItem(index, 'region', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择地区" />
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map((r: any) => (
                              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('createOrder.category')}</Label>
                        <Select value={item.category} onValueChange={(value) => updateContractItem(index, 'category', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择类别" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c: any) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('createOrder.productDetail')}</Label>
                        <Select value={item.productDetail} onValueChange={(value) => updateContractItem(index, 'productDetail', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择产品详情" />
                          </SelectTrigger>
                          <SelectContent>
                            {productDetails.map((pd: any) => (
                              <SelectItem key={pd.id} value={pd.name}>{pd.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('createOrder.productName')}</Label>
                        <div className="space-y-2">
                          <Select value={item.standardProductName} onValueChange={(value) => updateContractItem(index, 'standardProductName', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择标准产品" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredProducts.map((p: any) => (
                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={item.customProductName}
                            onChange={(e) => updateContractItem(index, 'customProductName', e.target.value)}
                            placeholder="非标准产品描述"
                          />
                        </div>
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
                                {colorTypes.map((ct: any) => (
                                  <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-2/3">
                            <Select value={item.colorCode} onValueChange={(value) => updateContractItem(index, 'colorCode', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="选择颜色" />
                              </SelectTrigger>
                              <SelectContent>
                                {allColors.map((c: any) => (
                                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="grid grid-cols-4 gap-4">
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
                                <SelectValue placeholder="选择单位" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredUnits.map((u: any) => (
                                  <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>{t('createOrder.retailPrice')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.retailPrice}
                              onChange={(e) => updateContractItem(index, 'retailPrice', parseFloat(e.target.value) || 0)}
                            />
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
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <Label>{t('createOrder.retailTotalLabel')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.retailTotal}
                              onChange={(e) => updateContractItem(index, 'retailTotal', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>{t('createOrder.dealTotalLabel')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.dealTotal}
                              onChange={(e) => updateContractItem(index, 'dealTotal', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label>{t('createOrder.remarks')}</Label>
                      <Input
                        value={item.remarks}
                        onChange={(e) => updateContractItem(index, 'remarks', e.target.value)}
                      />
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
                );
              })}
              <Button onClick={addContractItem} variant="outline">
                {t('createOrder.addAnotherItem')}
              </Button>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>{t('createOrder.contractRetailTotal')}</Label>
                  <Input readOnly value={contractTotals.retailTotal.toFixed(2)} />
                </div>
                <div>
                  <Label>{t('createOrder.contractDealTotal')}</Label>
                  <Input readOnly value={contractTotals.dealTotal.toFixed(2)} />
                </div>
              </div>
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
                {submitMutation.isPending ? (order ? t('createOrder.updatingOrder') : t('createOrder.creatingOrder')) : (order ? t('createOrder.saveChanges') : t('createOrder.createOrderDownload'))}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
  } else {
    return (
      <div className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto mx-auto">
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
                  placeholder="例如：CD20250001"
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
                    <SelectValue placeholder="选择经销商" />
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
              <div className="col-span-2">
                <Label htmlFor="attachments">Attachments</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.dwg"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAttachments(files);
                  }}
                />
                {attachments.length > 0 && (
                  <div className="mt-2">
                    <p>Selected files:</p>
                    <ul>
                      {attachments.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("items")}>
                {t('createOrder.nextAddItems')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <div className="space-y-4">
              {contractItems.map((item, index) => {
                const filteredProducts = allProducts.filter((p: any) => !item.category || p.category?.name === item.category);
                const filteredUnits = allUnits;

                return (
                  <div key={index} className="border p-4 rounded">
                    <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>{t('createOrder.region')}</Label>
                      <Select value={item.region} onValueChange={(value) => updateContractItem(index, 'region', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择地区" />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map((r: any) => (
                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('createOrder.category')}</Label>
                      <Select value={item.category} onValueChange={(value) => updateContractItem(index, 'category', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择类别" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c: any) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('createOrder.productDetail')}</Label>
                      <Select value={item.productDetail} onValueChange={(value) => updateContractItem(index, 'productDetail', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择产品详情" />
                        </SelectTrigger>
                        <SelectContent>
                          {productDetails.map((pd: any) => (
                            <SelectItem key={pd.id} value={pd.name}>{pd.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('createOrder.productName')}</Label>
                      <div className="space-y-2">
                        <Select value={item.standardProductName} onValueChange={(value) => updateContractItem(index, 'standardProductName', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择标准产品" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProducts.map((p: any) => (
                              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={item.customProductName}
                          onChange={(e) => updateContractItem(index, 'customProductName', e.target.value)}
                          placeholder="非标准产品描述"
                        />
                      </div>
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
                              {colorTypes.map((ct: any) => (
                                <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-2/3">
                          <Select value={item.colorCode} onValueChange={(value) => updateContractItem(index, 'colorCode', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择颜色" />
                            </SelectTrigger>
                            <SelectContent>
                              {allColors.map((c: any) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="grid grid-cols-4 gap-4">
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
                              <SelectValue placeholder="选择单位" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredUnits.map((u: any) => (
                                <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{t('createOrder.retailPrice')}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.retailPrice}
                            onChange={(e) => updateContractItem(index, 'retailPrice', parseFloat(e.target.value) || 0)}
                          />
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
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('createOrder.retailTotalLabel')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.retailTotal}
                          onChange={(e) => updateContractItem(index, 'retailTotal', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>{t('createOrder.dealTotalLabel')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.dealTotal}
                          onChange={(e) => updateContractItem(index, 'dealTotal', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <Label>{t('createOrder.remarks')}</Label>
                  <Input
                    value={item.remarks}
                    onChange={(e) => updateContractItem(index, 'remarks', e.target.value)}
                  />
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
            );
          })}
          <Button onClick={addContractItem} variant="outline">
            {t('createOrder.addAnotherItem')}
          </Button>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label>{t('createOrder.contractRetailTotal')}</Label>
              <Input readOnly value={contractTotals.retailTotal.toFixed(2)} />
            </div>
            <div>
              <Label>{t('createOrder.contractDealTotal')}</Label>
              <Input readOnly value={contractTotals.dealTotal.toFixed(2)} />
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setActiveTab("basic")}>
            {t('createOrder.back')}
          </Button>
          <Button onClick={handlePreview}>
            {t('createOrder.previewContract')}
          </Button>
        </div>
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
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("items")}>
                {t('createOrder.backToEdit')}
              </Button>
              <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? (order ? t('createOrder.updatingOrder') : t('createOrder.creatingOrder')) : (order ? t('createOrder.saveChanges') : t('createOrder.createOrderDownload'))}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
}