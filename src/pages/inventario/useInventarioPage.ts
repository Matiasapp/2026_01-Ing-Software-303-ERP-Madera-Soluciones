import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Product,
  ProductCategory,
  ProductStatus,
  Supplier,
  useInventory,
} from '../../context/InventoryContext';
import { useNotification } from '../../context/NotificationContext';
import { formatPhone } from '../../lib/format';
import { initialMovementForm, initialProductForm, initialSupplierForm } from './constants';
import type {
  CatalogTab,
  FilterCategoria,
  FilterEstado,
  ImportPreview,
  MovementForm,
  ProductForm,
  SortColumn,
  SortDir,
  SupplierForm,
} from './types';
import { generateSku, isAutoSku, parseCsv, sanitizeRow } from './utils';
import {
  validateMovementForm,
  validateProductForm,
  validateSupplierForm,
} from './validators';

export function useInventarioPage() {
  const {
    products,
    movements,
    suppliers,
    lowStockProducts,
    lowStockCount,
    isLoadingMovements,
    reloadMovimientos,
    addMovement,
    addProducts,
    updateProduct,
    deleteProduct,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    findSupplierByProduct,
  } = useInventory();
  const { success, error: notifyError, info } = useNotification();

  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  const [movementForm, setMovementForm] = useState<MovementForm>(initialMovementForm);
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id ?? 0);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [activeTab, setActiveTab] = useState<CatalogTab>('catalogo');

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<FilterCategoria>('todas');
  const [filterEstado, setFilterEstado] = useState<FilterEstado>('todos');
  const [sortBy, setSortBy] = useState<SortColumn>('nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [movDesde, setMovDesde] = useState('');
  const [movHasta, setMovHasta] = useState('');
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(initialSupplierForm);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);

  const selectedProduct =
    products.find(product => product.id === selectedProductId) ?? products[0];
  const lowStockSorted = useMemo(
    () => [...lowStockProducts].sort((a, b) => a.stockActual - b.stockActual),
    [lowStockProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    let result = products.filter(p => {
      if (
        q &&
        !p.sku.toLowerCase().includes(q) &&
        !p.nombre.toLowerCase().includes(q) &&
        !p.categoria.toLowerCase().includes(q) &&
        !p.proveedor.toLowerCase().includes(q)
      )
        return false;
      if (filterCategoria !== 'todas' && p.categoria !== filterCategoria) return false;
      if (filterEstado === 'bajo_stock')
        return p.estado === 'activo' && p.stockActual <= p.stockMinimo;
      if (filterEstado !== 'todos' && p.estado !== filterEstado) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'nombre') cmp = a.nombre.localeCompare(b.nombre);
      else if (sortBy === 'sku') cmp = a.sku.localeCompare(b.sku);
      else if (sortBy === 'stock') cmp = a.stockActual - b.stockActual;
      else if (sortBy === 'precio_ml') cmp = a.precioML - b.precioML;
      else if (sortBy === 'categoria') cmp = a.categoria.localeCompare(b.categoria);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [products, catalogSearch, filterCategoria, filterEstado, sortBy, sortDir]);

  const toggleSort = (col: SortColumn) => {
    if (sortBy === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const activeFilters =
    (filterCategoria !== 'todas' ? 1 : 0) + (filterEstado !== 'todos' ? 1 : 0);

  const totals = useMemo(() => {
    const totalValue = products.reduce(
      (sum, product) => sum + product.stockActual * product.costoCompra,
      0
    );
    const active = products.filter(product => product.estado === 'activo').length;
    const underMin = lowStockProducts.length;

    return { totalValue, active, underMin };
  }, [products, lowStockProducts]);

  const productErrors = useMemo(
    () => validateProductForm(productForm, products, editingProductId),
    [productForm, products, editingProductId]
  );
  const movementErrors = useMemo(() => validateMovementForm(movementForm), [movementForm]);
  const productFormValid = Object.keys(productErrors).length === 0;
  const movementFormValid = Object.keys(movementErrors).length === 0;

  const supplierErrors = validateSupplierForm(supplierForm);
  const supplierFormValid = Object.keys(supplierErrors).length === 0;

  const handleCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productFormValid) {
      notifyError('Completa el formulario de producto antes de guardar.');
      return;
    }

    const payload: Product = {
      id: editingProductId ?? Date.now(),
      sku: productForm.sku.trim(),
      nombre: productForm.nombre.trim(),
      categoria: productForm.categoria,
      proveedor: productForm.proveedor.trim(),
      costoCompra: Number(productForm.costoCompra),
      precioML: Number(productForm.precioML),
      precioSitioWeb: Number(productForm.precioSitioWeb),
      precioEstado: Number(productForm.precioEstado),
      stockActual: Number(productForm.stockActual),
      stockMinimo: Number(productForm.stockMinimo),
      unidadMedida: productForm.unidadMedida.trim() || 'unidad',
      estado: productForm.estado,
    };

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        success(`Producto ${payload.nombre} actualizado correctamente.`);
      } else {
        await addProducts([payload]);
        success(`Producto ${payload.nombre} creado correctamente.`);
      }
      setEditingProductId(null);
      setProductForm(initialProductForm);
      setShowProductModal(false);
      setSelectedProductId(payload.id);
    } catch {
      notifyError('Error al guardar el producto. Verifica los datos e intenta de nuevo.');
    }
  };

  const handleCreateMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!movementFormValid) {
      notifyError('Corrige los campos del movimiento antes de guardar.');
      return;
    }

    const payload = {
      productId: Number(movementForm.productId),
      tipo: movementForm.tipo,
      cantidad: Number(movementForm.cantidad),
      canal: movementForm.canal,
      fecha: movementForm.fecha,
    };

    try {
      await addMovement(payload);
      success('Movimiento de stock registrado correctamente.');
    } catch {
      notifyError('Error al guardar el movimiento.');
      return;
    }

    setMovementForm(current => ({ ...current, cantidad: '', canal: 'Bodega' }));
    setShowMovementModal(false);
  };

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (activeTab === 'catalogo') {
      const rows = products.map(product =>
        sanitizeRow({
          SKU: product.sku,
          Nombre: product.nombre,
          Categoria: product.categoria,
          Proveedor: product.proveedor,
          CostoCompra: product.costoCompra,
          PrecioML: product.precioML,
          PrecioSitioWeb: product.precioSitioWeb,
          PrecioEstado: product.precioEstado,
          StockActual: product.stockActual,
          StockMinimo: product.stockMinimo,
          UnidadMedida: product.unidadMedida,
          Estado: product.estado,
        })
      );
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Catalogo');
      XLSX.writeFile(workbook, 'catalogo-inventario-maderasoluciones.xlsx');
      success('Catálogo exportado a Excel correctamente.');
    } else if (activeTab === 'movimientos') {
      const rows = movements.map(movement =>
        sanitizeRow({
          ID: movement.id,
          Producto: products.find(p => p.id === movement.productId)?.nombre ?? 'Desconocido',
          Tipo: movement.tipo,
          Fecha: movement.fecha,
          Canal: movement.canal,
          Cantidad: movement.cantidad,
        })
      );
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Movimientos');
      XLSX.writeFile(workbook, 'movimientos-inventario-maderasoluciones.xlsx');
      success('Movimientos exportados a Excel correctamente.');
    } else {
      const rows = suppliers.map(supplier =>
        sanitizeRow({
          Nombre: supplier.nombre,
          RUT: supplier.rut,
          Contacto: supplier.contacto,
          Telefono: supplier.telefono,
          Ciudad: supplier.ciudad,
          TiempoEntrega: supplier.tiempoEntregaPromedio,
        })
      );
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Proveedores');
      XLSX.writeFile(workbook, 'proveedores-maderasoluciones.xlsx');
      success('Proveedores exportados a Excel correctamente.');
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? '');
      const rows = parseCsv(raw).map((row, index) => ({
        id: Date.now() + index,
        sku: row.sku,
        nombre: row.nombre,
        categoria: row.categoria as ProductCategory,
        proveedor: row.proveedor,
        costoCompra: Number(row.costoCompra),
        precioML: Number(row.precioML),
        precioSitioWeb: Number(row.precioSitioWeb),
        precioEstado: Number(row.precioEstado),
        stockActual: Number(row.stockActual),
        stockMinimo: Number(row.stockMinimo),
        unidadMedida: row.unidadMedida,
        estado: row.estado as ProductStatus,
      }));

      setPreview({ rows, rawName: file.name });
      info(`Archivo ${file.name} cargado. Revisa la previsualización antes de confirmar.`);
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!preview) return;
    addProducts(preview.rows);
    success(`${preview.rows.length} productos importados desde ${preview.rawName}.`);
    setPreview(null);
  };

  const handleProductFormChange = (patch: Partial<ProductForm>) => {
    setProductForm(current => {
      const next = { ...current, ...patch };
      if (patch.categoria && !editingProductId && (current.sku === '' || isAutoSku(current.sku))) {
        next.sku = generateSku(patch.categoria, products);
      }
      return next;
    });
  };

  const startCreateProduct = () => {
    setEditingProductId(null);
    setProductForm({ ...initialProductForm });
    setShowProductModal(true);
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      sku: product.sku,
      nombre: product.nombre,
      categoria: product.categoria,
      proveedor: product.proveedor,
      costoCompra: String(product.costoCompra),
      precioML: String(product.precioML),
      precioSitioWeb: String(product.precioSitioWeb),
      precioEstado: String(product.precioEstado),
      stockActual: String(product.stockActual),
      stockMinimo: String(product.stockMinimo),
      unidadMedida: product.unidadMedida,
      estado: product.estado,
    });
    setShowProductModal(true);
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setProductForm(initialProductForm);
    setShowProductModal(false);
  };

  const handleMovementFormChange = (patch: Partial<MovementForm>) =>
    setMovementForm(current => ({ ...current, ...patch }));

  const openMovementModal = () => {
    setMovementForm(initialMovementForm);
    setShowMovementModal(true);
  };

  const handleSupplierFormChange = (patch: Partial<SupplierForm>) =>
    setSupplierForm(current => ({ ...current, ...patch }));

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormValid) {
      notifyError('Completa correctamente el formulario de proveedor.');
      return;
    }
    try {
      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, {
          nombre: supplierForm.nombre,
          rut: supplierForm.rut,
          contacto: supplierForm.contacto,
          telefono: supplierForm.telefono,
          ciudad: supplierForm.ciudad,
        });
        success(`Proveedor ${supplierForm.nombre} actualizado.`);
      } else {
        await addSupplier({ ...supplierForm, tiempoEntregaPromedio: '3-5 días' });
        success(`Proveedor ${supplierForm.nombre} agregado.`);
      }
      setSupplierForm(initialSupplierForm);
      setEditingSupplierId(null);
      setShowSupplierModal(false);
    } catch {
      notifyError('Error al guardar el proveedor. Verifica los datos e intenta de nuevo.');
    }
  };

  const startCreateSupplier = () => {
    setEditingSupplierId(null);
    setSupplierForm(initialSupplierForm);
    setShowSupplierModal(true);
  };

  const startEditSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      nombre: supplier.nombre,
      rut: supplier.rut,
      contacto: supplier.contacto,
      telefono: formatPhone(supplier.telefono),
      ciudad: supplier.ciudad,
    });
    setShowSupplierModal(true);
  };

  const cancelSupplierEdit = () => {
    setEditingSupplierId(null);
    setSupplierForm(initialSupplierForm);
    setShowSupplierModal(false);
  };

  const confirmDeleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`¿Eliminar a ${supplier.nombre}? Esta acción no se puede deshacer.`))
      return;
    try {
      await deleteSupplier(supplier.id);
      success(`Proveedor ${supplier.nombre} eliminado.`);
      if (editingSupplierId === supplier.id) cancelSupplierEdit();
    } catch {
      notifyError('No se pudo eliminar el proveedor. Puede tener productos asociados.');
    }
  };

  const confirmDeleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Eliminar ${product.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteProduct(product.id);
      if (selectedProductId === product.id) setSelectedProductId(products[0]?.id ?? 0);
      success(`Producto ${product.nombre} eliminado correctamente.`);
    } catch (err) {
      // 23503 = foreign_key_violation: el producto tiene ventas o movimientos.
      // No se puede borrar sin romper el historial, así que ofrecemos el soft-delete
      // (descontinuar) en vez de dejar al usuario en un callejón sin salida.
      const isFkViolation = (err as { code?: string })?.code === '23503';
      if (!isFkViolation) {
        notifyError('No se pudo eliminar el producto. Intenta nuevamente.');
        return;
      }
      if (product.estado === 'descontinuado') {
        notifyError(
          `${product.nombre} tiene ventas o movimientos asociados y ya está descontinuado; no puede eliminarse.`
        );
        return;
      }
      const descontinuar = window.confirm(
        `No se puede eliminar ${product.nombre} porque tiene ventas o movimientos asociados.\n\n` +
          `¿Marcarlo como "descontinuado" para sacarlo del catálogo activo conservando el historial?`
      );
      if (!descontinuar) return;
      try {
        await updateProduct(product.id, { estado: 'descontinuado' });
        success(`${product.nombre} marcado como descontinuado.`);
      } catch {
        notifyError('No se pudo descontinuar el producto. Intenta nuevamente.');
      }
    }
  };

  const clearCatalogFilters = () => {
    setFilterCategoria('todas');
    setFilterEstado('todos');
    setCatalogSearch('');
  };

  const handleMovDesde = (value: string) => {
    setMovDesde(value);
    reloadMovimientos(value || undefined, movHasta || undefined);
  };

  const handleMovHasta = (value: string) => {
    setMovHasta(value);
    reloadMovimientos(movDesde || undefined, value || undefined);
  };

  const clearMovFilters = () => {
    setMovDesde('');
    setMovHasta('');
    reloadMovimientos();
  };

  return {
    // datos del contexto
    products,
    movements,
    suppliers,
    lowStockCount,
    isLoadingMovements,
    findSupplierByProduct,
    // estado derivado
    selectedProduct,
    selectedProductId,
    setSelectedProductId,
    lowStockSorted,
    filteredProducts,
    totals,
    activeFilters,
    // tabs
    activeTab,
    setActiveTab,
    // catálogo: búsqueda/filtros/orden
    catalogSearch,
    setCatalogSearch,
    filterCategoria,
    setFilterCategoria,
    filterEstado,
    setFilterEstado,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    toggleSort,
    clearCatalogFilters,
    // movimientos: filtros de fecha
    movDesde,
    movHasta,
    handleMovDesde,
    handleMovHasta,
    clearMovFilters,
    // modal producto
    showProductModal,
    editingProductId,
    productForm,
    productErrors,
    productFormValid,
    handleProductFormChange,
    handleCreateProduct,
    startCreateProduct,
    startEditProduct,
    cancelEdit,
    confirmDeleteProduct,
    // modal movimiento
    showMovementModal,
    movementForm,
    movementErrors,
    movementFormValid,
    handleMovementFormChange,
    handleCreateMovement,
    openMovementModal,
    closeMovementModal: () => setShowMovementModal(false),
    // modal proveedor
    showSupplierModal,
    editingSupplierId,
    supplierForm,
    supplierErrors,
    supplierFormValid,
    handleSupplierFormChange,
    handleSaveSupplier,
    startCreateSupplier,
    startEditSupplier,
    cancelSupplierEdit,
    confirmDeleteSupplier,
    // import/export
    preview,
    setPreview,
    confirmImport,
    handleExportExcel,
    handleFileSelection,
  };
}

export type InventarioVM = ReturnType<typeof useInventarioPage>;
