import {
  Banknote,
  CreditCard,
  ChevronDown,
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
import { useEffect, useRef } from "react";
import { usePosTerminal } from "../hooks/usePosTerminal";
import type { LinkedCustomer } from "../domain/types";
import { PosTicketModal } from "./PosTicketModal";

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

type CustomerSaleDropdownProps = {
  pos: ReturnType<typeof usePosTerminal>;
  labels: ReturnType<typeof usePosTerminal>["labels"];
  className?: string;
};

function CustomerSaleDropdown({ pos, labels, className = "" }: CustomerSaleDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos.customerDropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        pos.setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [pos.customerDropdownOpen, pos.setCustomerDropdownOpen]);

  if (!pos.canPickMember) return null;

  const selectedLabel = pos.selectedCustomer?.name ?? labels.customerDropdownPlaceholder;
  const hasCustomer = Boolean(pos.selectedCustomer?.name);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 h-full">
        <button
          type="button"
          onClick={() => pos.setCustomerDropdownOpen(!pos.customerDropdownOpen)}
          aria-expanded={pos.customerDropdownOpen}
          aria-haspopup="listbox"
          aria-label={labels.saleCustomerTitle}
          title={
            hasCustomer && pos.selectedCustomer
              ? `${pos.selectedCustomer.name} (${pos.selectedCustomer.id})`
              : labels.customerDropdownPlaceholder
          }
          className={`w-full h-[46px] flex items-center gap-2 bg-[#131313] border px-3 text-left transition-colors ${
            hasCustomer
              ? "border-[#e31e24]/40 text-[#e5e2e1]"
              : "border-[rgba(93,63,60,0.2)] text-[#808080] hover:border-[#e31e24]"
          }`}
        >
          <User size={16} className="text-[#e31e24] shrink-0" />
          <span className="flex-1 min-w-0 text-[13px] font-medium truncate">{selectedLabel}</span>
          <ChevronDown
            size={16}
            className={`shrink-0 transition-transform ${pos.customerDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {pos.customerDropdownOpen ? (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#0e0e0e] border border-[rgba(93,63,60,0.25)] shadow-[0_12px_40px_rgba(0,0,0,0.55)] p-3 space-y-2">
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#808080]"
              size={14}
            />
            <input
              type="text"
              value={pos.memberSearch}
              onChange={(e) => pos.setMemberSearch(e.target.value)}
              placeholder={labels.searchMemberPlaceholder}
              autoFocus
              className="w-full bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-8 pr-3 py-2 text-[12px] focus:border-[#e31e24] focus:outline-none"
            />
          </div>
          <div
            role="listbox"
            aria-label={labels.saleCustomerTitle}
            className="max-h-[min(220px,40vh)] overflow-y-auto space-y-1"
          >
            <button
              type="button"
              role="option"
              aria-selected={!hasCustomer}
              onClick={() => pos.clearSelectedCustomer()}
              className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                !hasCustomer
                  ? "bg-[#e31e24]/15 border border-[#e31e24]/40 text-[#e5e2e1]"
                  : "bg-[#131313] border border-transparent text-[#808080] hover:border-[rgba(93,63,60,0.3)]"
              }`}
            >
              {labels.noMemberSelected}
            </button>
            {pos.customersLoading ? (
              <p className="text-[#808080] text-[11px] px-3 py-2">{labels.membersLoading}</p>
            ) : pos.filteredCustomers.length === 0 ? (
              <p className="text-[#808080] text-[11px] px-3 py-2">{labels.noMembersFound}</p>
            ) : (
              pos.filteredCustomers.map((customer: LinkedCustomer) => {
                const selected = pos.selectedCustomer?.id === customer.id;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pos.selectCustomer(customer)}
                    className={`w-full text-left px-3 py-2 transition-colors ${
                      selected
                        ? "bg-[#e31e24]/15 border border-[#e31e24]/50"
                        : "bg-[#131313] border border-transparent hover:border-[#e31e24]/40"
                    }`}
                  >
                    <p className="text-[#e5e2e1] text-[12px] font-bold truncate">
                      {customer.name}
                    </p>
                    <p className="text-[#808080] text-[9px] font-mono truncate">
                      {customer.id}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
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
          {pos.sessionPayer?.name ? (
            <p className="text-[#808080] text-[11px] mt-2">
              {labels.ticketPayer}:{" "}
              <span className="text-[#e5e2e1] font-semibold">{pos.sessionPayer.name}</span>
              {pos.sessionPayer.id ? (
                <span className="font-mono text-[#a8a4a3] ml-1">({pos.sessionPayer.id})</span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`lg:col-span-2 space-y-4 ${
              showCheckoutDock ? "order-2 lg:order-none" : "order-1 lg:order-none"
            }`}
          >
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1 min-w-0 bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4">
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
                    className="w-full h-[46px] bg-[#131313] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] pl-11 pr-4 focus:border-[#e31e24] focus:outline-none transition-colors font-['Space_Grotesk',sans-serif] text-[14px]"
                  />
                </div>
              </div>
              <div className="shrink-0 bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 flex items-center">
                <button
                  type="button"
                  onClick={() => pos.setShowAddProductModal(true)}
                  className="h-[46px] bg-[#e31e24] text-white px-5 sm:px-6 flex items-center justify-center gap-2 hover:bg-[#c41a20] transition-colors whitespace-nowrap"
                >
                  <Package size={18} />
                  <span className="text-[10px] font-bold tracking-[1px] uppercase">
                    {labels.addProduct}
                  </span>
                </button>
              </div>
              <CustomerSaleDropdown
                pos={pos}
                labels={labels}
                className="w-full sm:w-[min(100%,280px)] shrink-0"
              />
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
            <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 shrink-0 space-y-2">
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
              {pos.canPickMember && pos.cart.length > 0 && !pos.selectedCustomer ? (
                <p className="text-[#808080] text-[10px] leading-snug">
                  {labels.noMemberSelected}
                </p>
              ) : null}
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
        <PosTicketModal
          receipt={pos.ticketReceipt}
          labels={labels}
          onClose={() => pos.setTicketReceipt(null)}
        />
      )}
    </div>
  );
}
