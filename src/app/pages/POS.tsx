import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, X, Package, User, Pencil } from "lucide-react";
import { toast } from "sonner";
import { addPosSale } from "../lib/demoStore";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

type IvaRegimen = "general" | "frontera";

type TicketReceipt = {
  id: string;
  lines: { name: string; id: string; qty: number; unit: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  member?: { id?: string; name?: string };
  createdIso: string;
  ivaRegimen: IvaRegimen;
  ivaRate: number;
  ivaLabelShort: string;
};

/**
 * Impuesto al Valor Agregado (LIVA) — tasas vigentes en México:
 * - 16% tasa general (mayoría del territorio nacional).
 * - 8% estímulo en región fronteriza norte (cumplimiento de requisitos ante el SAT).
 */
const IVA_TASA_GENERAL = 0.16;
const IVA_TASA_FRONTERA = 0.08;

const IVA_REGIMEN_LABEL: Record<IvaRegimen, string> = {
  general: "IVA 16%",
  frontera: "IVA 8%",
};

const INITIAL_PRODUCTS: Product[] = [
  { id: "SUP-001", name: "ISO WHEY PROTEIN 2LB", category: "SUPPLEMENTS", price: 45.99, stock: 23 },
  { id: "SUP-002", name: "PRE-WORKOUT RAGE", category: "SUPPLEMENTS", price: 32.99, stock: 18 },
  { id: "SUP-003", name: "RECOVERY BCAA", category: "SUPPLEMENTS", price: 28.50, stock: 31 },
  { id: "SUP-004", name: "CREATINE MONOHYDRATE", category: "SUPPLEMENTS", price: 24.99, stock: 27 },
  { id: "GEAR-001", name: "ELITE GYM TANK TOP", category: "GEAR", price: 19.99, stock: 45 },
  { id: "GEAR-002", name: "LIFTING GLOVES PRO", category: "GEAR", price: 15.99, stock: 12 },
  { id: "GEAR-003", name: "GYM TOWEL ELITE", category: "GEAR", price: 12.99, stock: 38 },
  { id: "ACC-001", name: "SHAKER BOTTLE 24OZ", category: "ACCESSORIES", price: 8.99, stock: 56 },
];

export default function POS() {
  const location = useLocation();
  const linkedMember = (location.state as { memberId?: string; memberName?: string } | null) ?? null;

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [ticketReceipt, setTicketReceipt] = useState<TicketReceipt | null>(null);
  const [ivaRegimen, setIvaRegimen] = useState<IvaRegimen>("general");

  useEffect(() => {
    if (linkedMember?.memberName) {
      toast.info(`POS vinculado a ${linkedMember.memberName}`, {
        description: "La vent retail queda asociada en el ticket de demo.",
      });
    }
  }, [linkedMember?.memberId, linkedMember?.memberName]);

  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "SUPPLEMENTS",
    price: "",
    stock: "",
  });

  const [editProduct, setEditProduct] = useState({
    name: "",
    category: "SUPPLEMENTS",
    price: "",
    stock: "",
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const generateProductId = (category: string) => {
    const prefix = category === "SUPPLEMENTS" ? "SUP" : category === "GEAR" ? "GEAR" : "ACC";
    const existingIds = products
      .filter((p) => p.id.startsWith(prefix))
      .map((p) => parseInt(p.id.split("-")[1]))
      .filter((n) => !isNaN(n));
    const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      toast.error("Completa nombre, precio y stock.");
      return;
    }

    const product: Product = {
      id: generateProductId(newProduct.category),
      name: newProduct.name.toUpperCase(),
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock),
    };

    setProducts([...products, product]);
    setNewProduct({ name: "", category: "SUPPLEMENTS", price: "", stock: "" });
    setShowAddProductModal(false);
  };

  const openEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditProduct({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
    });
  };

  const closeEditProduct = () => {
    setEditingProductId(null);
    setEditProduct({ name: "", category: "SUPPLEMENTS", price: "", stock: "" });
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;

    if (!editProduct.name || editProduct.price === "" || editProduct.stock === "") {
      toast.error("Completa nombre, precio y stock.");
      return;
    }

    const price = parseFloat(editProduct.price);
    const stock = parseInt(editProduct.stock, 10);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Precio no válido.");
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      toast.error("Stock no válido.");
      return;
    }

    const nextName = editProduct.name.trim().toUpperCase();
    const nextCategory = editProduct.category;

    setProducts((prev) =>
      prev.map((p) =>
        p.id === editingProductId
          ? { ...p, name: nextName, category: nextCategory, price, stock }
          : p
      )
    );

    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== editingProductId) return item;
        const qty = stock === 0 ? 0 : Math.min(item.quantity, stock);
        if (qty === 0) return { ...item, name: nextName, category: nextCategory, price, stock, quantity: 0 };
        return { ...item, name: nextName, category: nextCategory, price, stock, quantity: qty };
      }).filter((item) => item.quantity > 0)
    );

    toast.success("Producto actualizado");
    closeEditProduct();
  };

  const handleDeleteProduct = (product: Product) => {
    if (
      !window.confirm(
        `¿Eliminar "${product.name}" (${product.id})? Se quitará del catálogo y del carrito si está agregado.`
      )
    ) {
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    setCart((prev) => prev.filter((item) => item.id !== product.id));
    if (editingProductId === product.id) closeEditProduct();
    toast.success("Producto eliminado");
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.stock) return item;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaymentMethod("");
  };

  const ivaRate = ivaRegimen === "general" ? IVA_TASA_GENERAL : IVA_TASA_FRONTERA;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * ivaRate;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0 || !paymentMethod) return;

    const sub = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const rate = ivaRegimen === "general" ? IVA_TASA_GENERAL : IVA_TASA_FRONTERA;
    const tx = sub * rate;
    const tot = sub + tx;
    const tid = `TKT-${Date.now().toString(36).toUpperCase()}`;

    const receipt: TicketReceipt = {
      id: tid,
      lines: cart.map((c) => ({
        name: c.name,
        id: c.id,
        qty: c.quantity,
        unit: c.price,
        lineTotal: c.price * c.quantity,
      })),
      subtotal: sub,
      tax: tx,
      total: tot,
      paymentMethod,
      member:
        linkedMember?.memberId && linkedMember?.memberName
          ? { id: linkedMember.memberId, name: linkedMember.memberName }
          : undefined,
      createdIso: new Date().toISOString(),
      ivaRegimen,
      ivaRate: rate,
      ivaLabelShort: IVA_REGIMEN_LABEL[ivaRegimen],
    };

    setProducts((prev) =>
      prev.map((p) => {
        const line = cart.find((c) => c.id === p.id);
        if (!line) return p;
        return { ...p, stock: Math.max(0, p.stock - line.quantity) };
      })
    );

    addPosSale({
      total: receipt.total,
      method: receipt.paymentMethod,
      linesSummary: receipt.lines.map((l) => `${l.qty}× ${l.name}`).join(" · "),
      memberId: receipt.member?.id,
      memberName: receipt.member?.name,
      id: receipt.id.replace("TKT-", "POS-"),
    });

    setTicketReceipt(receipt);
    toast.success("Venta completada", {
      description: `Ticket ${tid} · ${paymentMethod}`,
    });
    clearCart();
  };

  return (
    <div className="h-full bg-[#131313] overflow-auto">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] md:tracking-[3px] uppercase mb-2">
            Point_of_Sale_System
          </p>
          <h1 className="text-[#e5e2e1] text-[32px] md:text-[48px] font-black tracking-[-2px] uppercase">
            POS Terminal
          </h1>
        </div>

        {linkedMember?.memberName && (
          <div className="mb-6 flex items-center gap-3 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] px-4 py-3">
            <User className="text-[#e31e24] shrink-0" size={20} />
            <div>
              <p className="text-[10px] text-[#808080] uppercase font-bold tracking-wide">Cliente seleccionado desde Members</p>
              <p className="text-[#e5e2e1] text-[14px] font-bold">
                {linkedMember.memberName}{" "}
                <span className="text-[#808080] font-mono text-[12px] font-normal">({linkedMember.memberId})</span>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Catalog */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search Bar & Add Product Button */}
            <div className="flex gap-3">
              <div className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="SCAN_SKU_OR_SEARCH_PRODUCT..."
                    className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-11 pr-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] text-[14px]"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="bg-[#e31e24] text-white px-6 py-3 flex items-center gap-2 hover:bg-[#c41a20] transition-colors"
              >
                <Package size={18} />
                <span className="text-[10px] font-bold tracking-[1px] uppercase whitespace-nowrap">
                  Add Product
                </span>
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-3">
              {["ALL", "SUPPLEMENTS", "GEAR", "ACCESSORIES"].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 text-[10px] font-bold tracking-[1px] uppercase transition-colors ${
                    selectedCategory === category
                      ? "bg-[#e31e24] text-white"
                      : "bg-[#0e0e0e] text-[#808080] border border-[rgba(93,63,60,0.2)] hover:border-[#e31e24]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => addToCart(product)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      addToCart(product);
                    }
                  }}
                  className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 cursor-pointer hover:border-[#e31e24] transition-colors relative"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditProduct(product);
                      }}
                      className="bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#e5e2e1] p-2 hover:border-[#e31e24] transition-colors"
                      aria-label={`Editar producto ${product.id}`}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product);
                      }}
                      className="bg-[#131313] border border-[rgba(93,63,60,0.25)] text-[#808080] p-2 hover:border-[#e31e24] hover:text-[#e31e24] transition-colors"
                      aria-label={`Eliminar producto ${product.id}`}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between items-start mb-2 pr-20">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#808080] text-[9px] font-bold tracking-[1px] mb-1">
                        {product.id}
                      </p>
                      <h3 className="text-[#e5e2e1] text-[14px] font-bold leading-tight mb-2">
                        {product.name}
                      </h3>
                      <p className="text-[#e31e24] text-[10px] font-bold tracking-[1px] uppercase">
                        {product.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-3 pt-3 border-t border-[rgba(93,63,60,0.1)]">
                    <span className="text-[#e5e2e1] text-[20px] font-black">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-[#808080] text-[10px]">
                      STOCK: {product.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Cart & Checkout */}
          <div className="space-y-4">
            {/* Cart Header */}
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4">
              <div className="flex justify-between items-center">
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
                  Current_Transaction
                </p>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[#808080] hover:text-[#e31e24] transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 min-h-[300px] max-h-[400px] overflow-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#808080] text-[12px]">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-[rgba(93,63,60,0.1)] pb-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-[#e5e2e1] text-[12px] font-bold leading-tight">
                            {item.name}
                          </p>
                          <p className="text-[#808080] text-[9px] mt-1">{item.id}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#808080] hover:text-[#e31e24] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-1 hover:border-[#e31e24] transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-[#e5e2e1] text-[14px] font-bold w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-1 hover:border-[#e31e24] transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="text-[#e31e24] text-[14px] font-black">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 space-y-3">
              <div>
                <label className="text-[#808080] text-[10px] font-bold uppercase tracking-wide block mb-1.5">
                  Régimen IVA (México · LIVA)
                </label>
                <select
                  value={ivaRegimen}
                  onChange={(e) => setIvaRegimen(e.target.value as IvaRegimen)}
                  className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2 text-[11px] focus:border-[#e31e24] focus:outline-none"
                >
                  <option value="general">16% — Tasa general</option>
                  <option value="frontera">8% — Estímulo frontera norte (requisitos SAT)</option>
                </select>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#808080]">SUBTOTAL</span>
                <span className="text-[#e5e2e1] font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#808080]">
                  {IVA_REGIMEN_LABEL[ivaRegimen]} <span className="text-[#5a5a5a] normal-case">(LIVA)</span>
                </span>
                <span className="text-[#e5e2e1] font-bold">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[20px] pt-2 border-t border-[rgba(93,63,60,0.2)]">
                <span className="text-[#e31e24] font-black">TOTAL</span>
                <span className="text-[#e5e2e1] font-black">${total.toFixed(2)} MXN</span>
              </div>
            </div>

            {/* Payment Methods */}
            {cart.length > 0 && (
              <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4">
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-3">
                  Payment_Method
                </p>
                <div className="space-y-2">
                  {[
                    { id: "CARD", label: "Tarjeta", icon: CreditCard },
                    { id: "CASH", label: "Efectivo", icon: Banknote },
                    { id: "QR", label: "QR Code", icon: QrCode },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setPaymentMethod(id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        paymentMethod === id
                          ? "bg-[#e31e24] text-white"
                          : "bg-[#131313] text-[#808080] border border-[rgba(93,63,60,0.2)] hover:border-[#e31e24]"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-[12px] font-bold tracking-[0.5px] uppercase">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || !paymentMethod}
              className={`w-full py-4 text-[12px] font-bold tracking-[1.2px] uppercase transition-colors ${
                cart.length > 0 && paymentMethod
                  ? "bg-[#e31e24] text-white hover:bg-[#c41a20] cursor-pointer"
                  : "bg-[#1a1a1a] text-[#393939] cursor-not-allowed"
              }`}
            >
              Complete Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  Inventory_Management
                </p>
                <h3 className="text-[#e5e2e1] text-[24px] font-black tracking-[-1px] uppercase">
                  Add New Product
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddProductModal(false);
                  setNewProduct({ name: "", category: "SUPPLEMENTS", price: "", stock: "" });
                }}
                className="text-[#808080] hover:text-[#e31e24] transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Enter product name"
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Category
                </label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                >
                  <option value="SUPPLEMENTS">SUPPLEMENTS</option>
                  <option value="GEAR">GEAR</option>
                  <option value="ACCESSORIES">ACCESSORIES</option>
                </select>
              </div>

              {/* Price and Stock Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    placeholder="0"
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>
              </div>

              {/* SKU Preview */}
              <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-3">
                <p className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase mb-1">
                  Generated SKU
                </p>
                <p className="text-[#e31e24] text-[14px] font-black">
                  {generateProductId(newProduct.category)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    setNewProduct({ name: "", category: "SUPPLEMENTS", price: "", stock: "" });
                  }}
                  className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProductId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  Inventory_Management
                </p>
                <h3 className="text-[#e5e2e1] text-[24px] font-black tracking-[-1px] uppercase">
                  Editar producto
                </h3>
                <p className="text-[#808080] text-[11px] font-mono mt-1">{editingProductId}</p>
              </div>
              <button
                type="button"
                onClick={closeEditProduct}
                className="text-[#808080] hover:text-[#e31e24] transition-colors"
                aria-label="Cerrar"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editProduct.name}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  Categoría
                </label>
                <select
                  value={editProduct.category}
                  onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                >
                  <option value="SUPPLEMENTS">SUPPLEMENTS</option>
                  <option value="GEAR">GEAR</option>
                  <option value="ACCESSORIES">ACCESSORIES</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editProduct.price}
                    onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editProduct.stock}
                    onChange={(e) => setEditProduct({ ...editProduct, stock: e.target.value })}
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>
              </div>

              <p className="text-[#5a5a5a] text-[10px] leading-relaxed">
                El SKU no se modifica al editar. Si reduces el stock por debajo de lo que hay en el carrito, la
                cantidad se ajusta o se quita la línea.
              </p>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeEditProduct}
                  className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ticketReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 overflow-auto">
          <div className="bg-[#f5f5f0] text-[#1a1a1a] max-w-md w-full shadow-2xl border-4 border-[#e31e24]">
            <div className="bg-[#1a1a1a] text-white px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#e31e24] font-bold">Elite Gym 24/7</p>
                <p className="text-[11px] font-mono mt-1">Ticket · {ticketReceipt.id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTicketReceipt(null);
                }}
                className="text-[#aaa] hover:text-white p-1"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 font-['Space_Grotesk',sans-serif]">
              <p className="text-[11px] text-[#555]">
                {new Date(ticketReceipt.createdIso).toLocaleString("es-MX", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
              {ticketReceipt.member && (
                <div className="text-[12px] border-b border-[#ddd] pb-3">
                  <p className="font-bold uppercase text-[10px] text-[#e31e24]">Cliente</p>
                  <p className="font-bold">{ticketReceipt.member.name}</p>
                  <p className="font-mono text-[11px] text-[#666]">{ticketReceipt.member.id}</p>
                </div>
              )}
              <div className="space-y-2">
                {ticketReceipt.lines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-2 text-[12px]">
                    <span>
                      <span className="font-bold">{line.qty}</span>× {line.name}
                      <span className="block font-mono text-[10px] text-[#888]">{line.id}</span>
                    </span>
                    <span className="font-bold shrink-0">${line.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#ccc] pt-3 space-y-1 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#666]">Subtotal</span>
                  <span>${ticketReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">
                    {ticketReceipt.ivaLabelShort}{" "}
                    <span className="text-[10px]">(LIVA — {(ticketReceipt.ivaRate * 100).toFixed(0)}%)</span>
                  </span>
                  <span>${ticketReceipt.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[18px] font-black pt-2">
                  <span>TOTAL</span>
                  <span>${ticketReceipt.total.toFixed(2)} MXN</span>
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-wide">
                Pago: <span className="font-bold">{ticketReceipt.paymentMethod}</span>
              </p>
              <p className="text-[10px] text-[#888] text-center pt-2 leading-relaxed">
                Montos en pesos mexicanos (MXN). IVA según Ley del Impuesto al Valor Agregado. Tasa 8% solo con
                acreditación en región fronteriza ante el SAT.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={() => setTicketReceipt(null)}
                className="w-full bg-[#e31e24] text-white py-3 font-bold text-[11px] uppercase tracking-wide hover:bg-[#c41a20] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
