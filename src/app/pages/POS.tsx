import { useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, X, Package } from "lucide-react";

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
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // New Product Form State
  const [newProduct, setNewProduct] = useState({
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
      alert("Por favor completa todos los campos");
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
    setShowPayment(false);
    setPaymentMethod("");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length > 0 && paymentMethod) {
      alert(`Venta procesada exitosamente!\nMétodo de pago: ${paymentMethod}\nTotal: $${total.toFixed(2)}`);
      clearCart();
    }
  };

  return (
    <div className="h-full bg-[#131313] overflow-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[3px] uppercase mb-2">
            Point_of_Sale_System
          </p>
          <h1 className="text-[#e5e2e1] text-[48px] font-black tracking-[-2px] uppercase">
            POS Terminal
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Product Catalog */}
          <div className="col-span-2 space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 cursor-pointer hover:border-[#e31e24] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
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
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#808080]">SUBTOTAL</span>
                <span className="text-[#e5e2e1] font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#808080]">TAX (8%)</span>
                <span className="text-[#e5e2e1] font-bold">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[20px] pt-2 border-t border-[rgba(93,63,60,0.2)]">
                <span className="text-[#e31e24] font-black">TOTAL</span>
                <span className="text-[#e5e2e1] font-black">${total.toFixed(2)}</span>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-8 max-w-md w-full mx-4">
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
    </div>
  );
}
