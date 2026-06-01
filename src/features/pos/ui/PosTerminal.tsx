import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, X, Package, User, Pencil } from "lucide-react";
import { toast } from "sonner";
import { posService } from "../application/posService";
import { posConfig } from "../config";
import { generateProductSku } from "../domain/productId";
import { getIvaRate, IVA_REGIMEN_LABEL } from "../domain/tax";
import type {
  IvaRegimen,
  PosLinkedMember,
  PosProduct,
  PosTicketReceipt,
} from "../domain/types";

type CartItem = PosProduct & { quantity: number };

export type PosTerminalProps = {
  linkedMember?: PosLinkedMember | null;
};

export function PosTerminal({ linkedMember = null }: PosTerminalProps) {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const apiMode = posConfig.useMock ? "local" : "rest";
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [ticketReceipt, setTicketReceipt] = useState<PosTicketReceipt | null>(null);
  const [ivaRegimen, setIvaRegimen] = useState<IvaRegimen>("general");

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const list = await posService.listProducts();
      setProducts(list);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cargar el catálogo POS.",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (linkedMember?.memberName) {
      toast.info(`POS vinculado a ${linkedMember.memberName}`, {
        description: "La venta quedará asociada al ticket.",
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      toast.error("Completa nombre, precio y stock.");
      return;
    }

    try {
      const created = await posService.createProduct(
        {
          name: newProduct.name,
          category: newProduct.category,
          price: parseFloat(newProduct.price),
          stock: parseInt(newProduct.stock, 10),
        },
        products,
      );
      setProducts((prev) => [...prev, created]);
      setNewProduct({ name: "", category: "SUPPLEMENTS", price: "", stock: "" });
      setShowAddProductModal(false);
      toast.success("Producto agregado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear producto");
    }
  };

  const openEditProduct = (product: PosProduct) => {
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

  const handleSaveEditProduct = async (e: React.FormEvent) => {
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

    try {
      const updated = await posService.updateProduct(editingProductId, {
        name: nextName,
        category: nextCategory,
        price,
        stock,
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProductId ? updated : p)),
      );

      setCart((prev) =>
        prev
          .map((item) => {
            if (item.id !== editingProductId) return item;
            const qty = stock === 0 ? 0 : Math.min(item.quantity, stock);
            if (qty === 0) {
              return { ...updated, quantity: 0 };
            }
            return { ...updated, quantity: qty };
          })
          .filter((item) => item.quantity > 0),
      );

      toast.success("Producto actualizado");
      closeEditProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar");
    }
  };

  const handleDeleteProduct = async (product: PosProduct) => {
    if (
      !window.confirm(
        `¿Eliminar "${product.name}" (${product.id})? Se quitará del catálogo y del carrito si está agregado.`
      )
    ) {
      return;
    }
    try {
      await posService.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setCart((prev) => prev.filter((item) => item.id !== product.id));
      if (editingProductId === product.id) closeEditProduct();
      toast.success("Producto eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  const addToCart = (product: PosProduct) => {
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

  const ivaRate = getIvaRate(ivaRegimen);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * ivaRate;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0 || !paymentMethod) return;

    try {
      const { receipt, products: nextProducts } = await posService.checkout({
        lines: cart,
        paymentMethod: paymentMethod as "CARD" | "CASH" | "QR",
        ivaRegimen,
        member:
          linkedMember?.memberId && linkedMember?.memberName
            ? { id: linkedMember.memberId, name: linkedMember.memberName }
            : undefined,
      });

      setProducts(nextProducts);
      setTicketReceipt(receipt);
      toast.success("Venta completada", {
        description: `Ticket ${receipt.id} · ${paymentMethod}`,
      });
      clearCart();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cerrar venta");
    }
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
          <p className="text-[#808080] text-[10px] mt-2 uppercase tracking-wide">
            API: {apiMode === "rest" ? "Neubox REST" : "Local / fallback"}
            {catalogLoading ? " · cargando…" : ""}
          </p>
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
                  {generateProductSku(newProduct.category, products)}
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
