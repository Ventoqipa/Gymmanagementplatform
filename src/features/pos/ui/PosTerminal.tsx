import {
  Banknote,
  CreditCard,
  Minus,
  Package,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X,
} from "lucide-react";
import { usePosTerminal } from "../hooks/usePosTerminal";

const PAYMENT_ICONS = {
  CARD: CreditCard,
  CASH: Banknote,
  QR: QrCode,
} as const;

type CheckoutDockProps = {
  pos: ReturnType<typeof usePosTerminal>;
  labels: ReturnType<typeof usePosTerminal>["labels"];
  canCheckout: boolean;
  className?: string;
};

function CheckoutDock({ pos, labels, canCheckout, className = "" }: CheckoutDockProps) {
  return (
    <div
      className={`bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] p-3 sm:p-4 space-y-3 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[#808080] text-[9px] font-bold uppercase tracking-wide">
            {labels.paymentMethod}
          </p>
          <p className="text-[#e5e2e1] text-[11px] mt-0.5">
            {pos.cart.length} {pos.cart.length === 1 ? "artículo" : "artículos"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#808080] text-[9px] font-bold uppercase tracking-wide">
            {labels.total}
          </p>
          <p className="text-[#e5e2e1] text-[18px] font-black tabular-nums leading-none mt-0.5">
            ${pos.total.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {labels.paymentMethodOptions.map(({ id, label }) => {
          const Icon = PAYMENT_ICONS[id as keyof typeof PAYMENT_ICONS] ?? CreditCard;
          const selected = pos.paymentMethod === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => pos.setPaymentMethod(id)}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 transition-colors min-h-[56px] ${
                selected
                  ? "bg-[#e31e24] text-white"
                  : "bg-[#131313] text-[#808080] border border-[rgba(93,63,60,0.25)] hover:border-[#e31e24] hover:text-[#e5e2e1]"
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold tracking-wide uppercase leading-tight text-center">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => void pos.handleCheckout()}
        disabled={!canCheckout}
        className={`w-full flex items-center justify-center gap-2 py-3.5 text-[11px] font-bold tracking-[1.2px] uppercase transition-colors ${
          canCheckout
            ? "bg-[#e31e24] text-white hover:bg-[#c41a20] cursor-pointer"
            : "bg-[#1a1a1a] text-[#393939] cursor-not-allowed"
        }`}
      >
        <ShoppingCart size={18} />
        {labels.checkout}
        <span className="tabular-nums opacity-90">
          · ${pos.total.toFixed(2)}
        </span>
      </button>
    </div>
  );
}

export function PosTerminal() {
  const pos = usePosTerminal();
  const { labels } = pos;
  const canCheckout = pos.cart.length > 0 && Boolean(pos.paymentMethod);
  const showCheckoutDock = pos.cart.length > 0;

  return (
    <div className={`h-full bg-[#131313] overflow-auto ${showCheckoutDock ? "pb-[11.5rem] lg:pb-8" : ""}`}>
      <div className="p-4 md:p-6">
        <div className="mb-3 md:mb-4">
          <h1 className="text-[#e5e2e1] text-[22px] md:text-[30px] font-black tracking-[-0.5px] uppercase leading-tight">
            {labels.title}
          </h1>
        </div>

        {pos.linkedCustomer?.name && (
          <div className="mb-6 flex items-center gap-3 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] px-4 py-3">
            <User className="text-[#e31e24] shrink-0" size={20} />
            <div>
              <p className="text-[#808080] text-[10px] uppercase font-bold tracking-wide">
                {labels.linkedCustomerHint}
              </p>
              <p className="text-[#e5e2e1] text-[14px] font-bold">
                {pos.linkedCustomer.name}{" "}
                <span className="text-[#808080] font-mono text-[12px] font-normal">
                  ({pos.linkedCustomer.id})
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`lg:col-span-2 space-y-4 ${
              showCheckoutDock ? "order-2 lg:order-none" : "order-1 lg:order-none"
            }`}
          >
            <div className="flex gap-3">
              <div className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]"
                    size={18}
                  />
                  <input
                    type="text"
                    value={pos.searchTerm}
                    onChange={(e) => pos.setSearchTerm(e.target.value)}
                    placeholder={labels.searchPlaceholder}
                    className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-11 pr-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] text-[14px]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => pos.setShowAddProductModal(true)}
                className="bg-[#e31e24] text-white px-6 py-3 flex items-center gap-2 hover:bg-[#c41a20] transition-colors"
              >
                <Package size={18} />
                <span className="text-[10px] font-bold tracking-[1px] uppercase whitespace-nowrap">
                  {labels.addProduct}
                </span>
              </button>
            </div>

            <div className="flex gap-3 flex-wrap">
              {labels.categoryFilterIds.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => pos.setSelectedCategory(category)}
                  className={`px-4 py-2 text-[10px] font-bold tracking-[1px] uppercase transition-colors ${
                    pos.selectedCategory === category
                      ? "bg-[#e31e24] text-white"
                      : "bg-[#0e0e0e] text-[#808080] border border-[rgba(93,63,60,0.2)] hover:border-[#e31e24]"
                  }`}
                >
                  {labels.productCategories[category] ?? category}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pos.productsLoading ? (
                <div className="col-span-full py-12 text-center text-[#808080] text-[13px]">
                  Cargando lista de productos…
                </div>
              ) : pos.filteredProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-[#808080] text-[13px] space-y-2">
                  <p>No hay productos en el catálogo.</p>
                  <p className="text-[11px]">
                    Verifica la conexión al POS API o agrega productos con el botón de inventario.
                  </p>
                </div>
              ) : null}
              {pos.filteredProducts.map((product) => (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => pos.addToCart(product)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pos.addToCart(product);
                    }
                  }}
                  className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 cursor-pointer hover:border-[#e31e24] transition-colors relative"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        pos.openEditProduct(product);
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
                        void pos.handleDeleteProduct(product);
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
                    <span className="text-[#e5e2e1] text-[16px] font-black">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-[#808080] text-[10px]">
                      {labels.stockLabel}: {product.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`lg:col-span-1 lg:sticky lg:top-4 lg:self-start flex flex-col gap-4 max-h-[calc(100vh-2rem)] ${
              showCheckoutDock ? "order-1 lg:order-none" : "order-2 lg:order-none"
            }`}
          >
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 shrink-0">
              <div className="flex justify-between items-center">
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
                  {labels.cartTitle}
                </p>
                {pos.cart.length > 0 && (
                  <button
                    type="button"
                    onClick={pos.clearCart}
                    className="text-[#808080] hover:text-[#e31e24] transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 min-h-[160px] flex-1 overflow-auto lg:max-h-[min(360px,calc(100vh-22rem))]">
              {pos.cart.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#808080] text-[12px]">{labels.emptyCart}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pos.cart.map((item) => (
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
                          type="button"
                          onClick={() => pos.removeFromCart(item.id)}
                          className="text-[#808080] hover:text-[#e31e24] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => pos.updateQuantity(item.id, -1)}
                            className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-1 hover:border-[#e31e24] transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-[#e5e2e1] text-[14px] font-bold w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => pos.updateQuantity(item.id, 1)}
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

            {showCheckoutDock && (
              <div className="hidden lg:block shrink-0">
                <CheckoutDock pos={pos} labels={labels} canCheckout={canCheckout} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showCheckoutDock && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <CheckoutDock
            pos={pos}
            labels={labels}
            canCheckout={canCheckout}
            className="border-x-0 border-b-0 rounded-none"
          />
        </div>
      )}

      {pos.showAddProductModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  {labels.inventory}
                </p>
                <h3 className="text-[#e5e2e1] text-[18px] font-black tracking-[-0.5px] uppercase">
                  {labels.newProduct}
                </h3>
              </div>
              <button
                type="button"
                onClick={pos.closeAddModal}
                className="text-[#808080] hover:text-[#e31e24] transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={(e) => void pos.handleAddProduct(e)} className="space-y-4">
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  {labels.productName}
                </label>
                <input
                  type="text"
                  value={pos.newProduct.name}
                  onChange={(e) =>
                    pos.setNewProduct({ ...pos.newProduct, name: e.target.value })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  {labels.category}
                </label>
                <select
                  value={pos.newProduct.category}
                  onChange={(e) =>
                    pos.setNewProduct({
                      ...pos.newProduct,
                      category: e.target.value,
                    })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                >
                  {labels.productCategoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    {labels.price}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pos.newProduct.price}
                    onChange={(e) =>
                      pos.setNewProduct({ ...pos.newProduct, price: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    {labels.stock}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pos.newProduct.stock}
                    onChange={(e) =>
                      pos.setNewProduct({ ...pos.newProduct, stock: e.target.value })
                    }
                    placeholder="0"
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>
              </div>

              <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-3">
                <p className="text-[#808080] text-[9px] font-bold tracking-[1px] uppercase mb-1">
                  {labels.generatedCode}
                </p>
                <p className="text-[#e31e24] text-[14px] font-black">
                  {pos.previewSku(pos.newProduct.category)}
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={pos.closeAddModal}
                  className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
                >
                  {labels.addProduct}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pos.editingProductId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                  {labels.inventory}
                </p>
                <h3 className="text-[#e5e2e1] text-[18px] font-black tracking-[-0.5px] uppercase">
                  {labels.editProduct}
                </h3>
                <p className="text-[#808080] text-[11px] font-mono mt-1">
                  {pos.editingProductId}
                </p>
              </div>
              <button
                type="button"
                onClick={pos.closeEditProduct}
                className="text-[#808080] hover:text-[#e31e24] transition-colors"
                aria-label="Cerrar"
              >
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={(e) => void pos.handleSaveEditProduct(e)}
              className="space-y-4"
            >
              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  {labels.productName}
                </label>
                <input
                  type="text"
                  value={pos.editProduct.name}
                  onChange={(e) =>
                    pos.setEditProduct({ ...pos.editProduct, name: e.target.value })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                  {labels.category}
                </label>
                <select
                  value={pos.editProduct.category}
                  onChange={(e) =>
                    pos.setEditProduct({
                      ...pos.editProduct,
                      category: e.target.value,
                    })
                  }
                  className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                >
                  {labels.productCategoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    {labels.price}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pos.editProduct.price}
                    onChange={(e) =>
                      pos.setEditProduct({ ...pos.editProduct, price: e.target.value })
                    }
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                    {labels.stock}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pos.editProduct.stock}
                    onChange={(e) =>
                      pos.setEditProduct({ ...pos.editProduct, stock: e.target.value })
                    }
                    className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif]"
                    required
                  />
                </div>
              </div>

              <p className="text-[#5a5a5a] text-[10px] leading-relaxed">
                {labels.editStockHint}
              </p>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={pos.closeEditProduct}
                  className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors"
                >
                  {labels.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pos.ticketReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 overflow-auto">
          <div className="bg-[#f5f5f0] text-[#1a1a1a] max-w-md w-full shadow-2xl border-4 border-[#e31e24]">
            <div className="bg-[#1a1a1a] text-white px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#e31e24] font-bold">
                  {labels.ticketBrand}
                </p>
                <p className="text-[11px] font-mono mt-1">
                  Ticket · {pos.ticketReceipt.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => pos.setTicketReceipt(null)}
                className="text-[#aaa] hover:text-white p-1"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 font-['Space_Grotesk',sans-serif]">
              <p className="text-[11px] text-[#555]">
                {new Date(pos.ticketReceipt.createdIso).toLocaleString("es-MX", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
              {pos.ticketReceipt.member && (
                <div className="text-[12px] border-b border-[#ddd] pb-3">
                  <p className="font-bold uppercase text-[10px] text-[#e31e24]">
                    {labels.ticketClient}
                  </p>
                  <p className="font-bold">{pos.ticketReceipt.member.name}</p>
                  <p className="font-mono text-[11px] text-[#666]">
                    {pos.ticketReceipt.member.id}
                  </p>
                </div>
              )}
              {pos.ticketReceipt.payer?.name && (
                <div className="text-[12px] border-b border-[#ddd] pb-3">
                  <p className="font-bold uppercase text-[10px] text-[#e31e24]">
                    Pagador
                  </p>
                  <p className="font-bold">{pos.ticketReceipt.payer.name}</p>
                  {pos.ticketReceipt.payer.id && (
                    <p className="font-mono text-[11px] text-[#666]">
                      {pos.ticketReceipt.payer.id}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {pos.ticketReceipt.lines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-2 text-[12px]">
                    <span>
                      <span className="font-bold">{line.qty}</span>× {line.name}
                      <span className="block font-mono text-[10px] text-[#888]">
                        {line.id}
                      </span>
                    </span>
                    <span className="font-bold shrink-0">
                      ${line.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#ccc] pt-3 space-y-1 text-[12px]">
                <div className="flex justify-between text-[18px] font-black pt-2">
                  <span>{labels.total}</span>
                  <span>
                    ${pos.ticketReceipt.total.toFixed(2)} {labels.currencySuffix}
                  </span>
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-wide">
                {labels.ticketPayment}:{" "}
                <span className="font-bold">
                  {labels.paymentMethods[pos.ticketReceipt.paymentMethod] ??
                    pos.ticketReceipt.paymentMethod}
                </span>
              </p>
              <p className="text-[10px] text-[#888] text-center pt-2 leading-relaxed">
                {labels.ticketFooter}
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={() => pos.setTicketReceipt(null)}
                className="w-full bg-[#e31e24] text-white py-3 font-bold text-[11px] uppercase tracking-wide hover:bg-[#c41a20] transition-colors"
              >
                {labels.ticketClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
