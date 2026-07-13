import { PosApiError } from "../api/posHttpClient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateProductSku } from "../domain/productId";
import type {
  CartLine,
  LinkedCustomer,
  PosProduct,
  PosTicketReceipt,
  ProductFormState,
} from "../domain/types";
import { usePosContext } from "../ui/PosProvider";

const emptyForm = (category: string): ProductFormState => ({
  name: "",
  category,
  price: "",
  stock: "",
});

export function usePosTerminal() {
  const { config, service, linkedCustomer } = usePosContext();
  const { labels, notify, defaultProductCategory, confirmDelete } = config;

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [ticketReceipt, setTicketReceipt] = useState<PosTicketReceipt | null>(
    null,
  );
  const [newProduct, setNewProduct] = useState<ProductFormState>(() =>
    emptyForm(defaultProductCategory),
  );
  const [editProduct, setEditProduct] = useState<ProductFormState>(() =>
    emptyForm(defaultProductCategory),
  );
  const [selectedCustomer, setSelectedCustomer] = useState<LinkedCustomer | null>(
    () =>
      linkedCustomer?.id && linkedCustomer?.name ? { ...linkedCustomer } : null,
  );
  const [customerOptions, setCustomerOptions] = useState<LinkedCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const canPickMember = Boolean(config.loadCustomers);

  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const list = await service.listProducts();
      setProducts(list);
    } catch (error) {
      const message =
        error instanceof PosApiError
          ? error.message
          : "No se pudo cargar la lista de productos.";
      notify.error(message);
    } finally {
      setProductsLoading(false);
    }
  }, [service, notify]);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    if (linkedCustomer?.id && linkedCustomer?.name) {
      setSelectedCustomer({ id: linkedCustomer.id, name: linkedCustomer.name });
      notify.info(`Tienda vinculada a ${linkedCustomer.name}`, {
        description: "La venta queda asociada al miembro en el ticket.",
      });
    }
  }, [linkedCustomer?.id, linkedCustomer?.name, notify]);

  useEffect(() => {
    const load = config.loadCustomers;
    if (!load) return;
    let cancelled = false;
    setCustomersLoading(true);
    void load()
      .then((list) => {
        if (!cancelled) setCustomerOptions(list);
      })
      .catch(() => {
        if (!cancelled) setCustomerOptions([]);
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config.loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return customerOptions;
    return customerOptions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    );
  }, [customerOptions, memberSearch]);

  const openCustomerDropdown = () => {
    setCustomerDropdownOpen(true);
  };

  const selectCustomer = (customer: LinkedCustomer | null) => {
    setSelectedCustomer(customer);
    setCustomerDropdownOpen(false);
    setMemberSearch("");
  };

  const clearSelectedCustomer = () => {
    selectCustomer(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "ALL" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const previewSku = useCallback(
    (category: string) => generateProductSku(category, products),
    [products],
  );

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      notify.error("Completa nombre, precio y stock.");
      return;
    }
    const price = parseFloat(newProduct.price);
    const stock = parseInt(newProduct.stock, 10);
    if (Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
      notify.error("Precio o stock no válido.");
      return;
    }
    try {
      await service.createProduct({
        name: newProduct.name,
        category: newProduct.category,
        price,
        stock,
      });
      await refreshProducts();
      setNewProduct(emptyForm(defaultProductCategory));
      setShowAddProductModal(false);
      notify.success("Producto agregado");
    } catch (error) {
      notify.error(
        error instanceof PosApiError ? error.message : "No se pudo agregar el producto.",
      );
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
    setEditProduct(emptyForm(defaultProductCategory));
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    if (!editProduct.name || editProduct.price === "" || editProduct.stock === "") {
      notify.error("Completa nombre, precio y stock.");
      return;
    }
    const price = parseFloat(editProduct.price);
    const stock = parseInt(editProduct.stock, 10);
    if (Number.isNaN(price) || price < 0) {
      notify.error("Precio no válido.");
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      notify.error("Stock no válido.");
      return;
    }
    const nextName = editProduct.name.trim().toUpperCase();
    const nextCategory = editProduct.category;
    try {
      await service.updateProduct(editingProductId, {
        name: nextName,
        category: nextCategory,
        price,
        stock,
      });
      await refreshProducts();
      setCart((prev) =>
        prev
          .map((item) => {
            if (item.id !== editingProductId) return item;
            const qty = stock === 0 ? 0 : Math.min(item.quantity, stock);
            if (qty === 0) {
              return {
                ...item,
                name: nextName,
                category: nextCategory,
                price,
                stock,
                quantity: 0,
              };
            }
            return {
              ...item,
              name: nextName,
              category: nextCategory,
              price,
              stock,
              quantity: qty,
            };
          })
          .filter((item) => item.quantity > 0),
      );
      notify.success("Producto actualizado");
      closeEditProduct();
    } catch (error) {
      notify.error(
        error instanceof PosApiError ? error.message : "No se pudo actualizar el producto.",
      );
    }
  };

  const handleDeleteProduct = async (product: PosProduct) => {
    if (!confirmDelete(labels.deleteConfirm(product.name))) return;
    try {
      await service.deleteProduct(product.id);
      await refreshProducts();
      setCart((prev) => prev.filter((item) => item.id !== product.id));
      if (editingProductId === product.id) closeEditProduct();
      notify.success("Producto eliminado");
    } catch (error) {
      notify.error(
        error instanceof PosApiError ? error.message : "No se pudo eliminar el producto.",
      );
    }
  };

  const addToCart = (product: PosProduct) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.id !== productId) return item;
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.stock) return item;
        return { ...item, quantity: newQuantity };
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaymentMethod("");
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const sessionPayer = config.getSessionPayer?.() ?? null;

  const handleCheckout = async () => {
    if (cart.length === 0 || !paymentMethod) return;
    const member: LinkedCustomer | undefined =
      selectedCustomer?.id && selectedCustomer?.name
        ? { id: selectedCustomer.id, name: selectedCustomer.name }
        : undefined;
    const payer = config.getSessionPayer?.() ?? undefined;
    try {
      const result = await service.checkout(
        cart,
        paymentMethod,
        member,
        config.ivaRegimen,
        payer ?? undefined,
      );
      setProducts(result.products);
      setTicketReceipt(result.receipt);
      config.onSaleComplete?.(result.sale);
      notify.success("Venta completada", {
        description: `Ticket ${result.receipt.id} · ${paymentMethod}`,
      });
      clearCart();
    } catch (error) {
      notify.error(
        error instanceof PosApiError ? error.message : "No se pudo completar la venta.",
      );
    }
  };

  const closeAddModal = () => {
    setShowAddProductModal(false);
    setNewProduct(emptyForm(defaultProductCategory));
  };

  return {
    labels,
    linkedCustomer,
    canPickMember,
    selectedCustomer,
    selectCustomer,
    clearSelectedCustomer,
    openCustomerDropdown,
    customersLoading,
    customerDropdownOpen,
    setCustomerDropdownOpen,
    memberSearch,
    setMemberSearch,
    filteredCustomers,
    products,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    cart,
    selectedCategory,
    setSelectedCategory,
    paymentMethod,
    setPaymentMethod,
    showAddProductModal,
    setShowAddProductModal,
    editingProductId,
    ticketReceipt,
    setTicketReceipt,
    newProduct,
    setNewProduct,
    editProduct,
    setEditProduct,
    productsLoading,
    refreshProducts,
    previewSku,
    total,
    sessionPayer,
    handleAddProduct,
    openEditProduct,
    closeEditProduct,
    handleSaveEditProduct,
    handleDeleteProduct,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    handleCheckout,
    closeAddModal,
  };
}
