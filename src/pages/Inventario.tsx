import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  MovementType,
  Product,
  ProductCategory,
  ProductStatus,
  Supplier,
  useInventory,
} from '../context/InventoryContext';
import { useNotification } from '../context/NotificationContext';

type ProductForm = {
  sku: string;
  nombre: string;
  categoria: ProductCategory;
  proveedor: string;
  costoCompra: string;
  precioML: string;
  precioSitioWeb: string;
  precioEstado: string;
  stockActual: string;
  stockMinimo: string;
  unidadMedida: string;
  estado: ProductStatus;
};

type MovementForm = {
  productId: string;
  tipo: MovementType;
  cantidad: string;
  canal: string;
  fecha: string;
};

type ImportPreview = {
  rows: Product[];
  rawName: string;
};

type PurchaseDraft = {
  productId: number;
  cantidad: number;
  proveedor: string;
  nota: string;
} | null;

const categoryOptions: ProductCategory[] = ['barras', 'rieles', 'soportes', 'tornillería', 'otros'];
const statusOptions: ProductStatus[] = ['activo', 'inactivo', 'descontinuado'];
const movementOptions: MovementType[] = [
  'entrada por compra',
  'salida ML Full/Flex/Envíos',
  'salida sitio web',
  'salida WhatsApp',
  'salida Estado',
  'ajuste de inventario',
  'merma',
];

const initialProductForm: ProductForm = {
  sku: '',
  nombre: '',
  categoria: 'barras',
  proveedor: '',
  costoCompra: '',
  precioML: '',
  precioSitioWeb: '',
  precioEstado: '',
  stockActual: '',
  stockMinimo: '',
  unidadMedida: 'unidad',
  estado: 'activo',
};

const initialMovementForm: MovementForm = {
  productId: '',
  tipo: 'entrada por compra',
  cantidad: '',
  canal: 'Bodega',
  fecha: new Date().toISOString().slice(0, 10),
};

const currency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CL').format(new Date(`${value}T00:00:00`));

const formatProductLabel = (product: Product) => `${product.sku} · ${product.nombre}`;

const Inventory: React.FC = () => {
  const {
    products,
    movements,
    suppliers,
    lowStockProducts,
    lowStockCount,
    addMovement,
    addProducts,
    updateProduct,
    deleteProduct,
    findSupplierByProduct,
  } = useInventory();
  const { success, error: notifyError, info } = useNotification();

  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  const [movementForm, setMovementForm] = useState<MovementForm>(initialMovementForm);
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id ?? 0);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft>(null);
  const [activeTab, setActiveTab] = useState<'catalogo' | 'movimientos' | 'proveedores'>(
    'catalogo'
  );
  const [exportMessage, setExportMessage] = useState('');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const selectedProduct = products.find(product => product.id === selectedProductId) ?? products[0];
  const lowStockSorted = useMemo(
    () => [...lowStockProducts].sort((a, b) => a.stockActual - b.stockActual),
    [lowStockProducts]
  );

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

  const handleCreateProduct = (event: React.FormEvent) => {
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

    if (editingProductId) {
      updateProduct(editingProductId, payload);
      success(`Producto ${payload.nombre} actualizado correctamente.`);
    } else {
      addProducts([payload]);
      success(`Producto ${payload.nombre} creado correctamente.`);
    }

    setEditingProductId(null);
    setProductForm(initialProductForm);
    setSelectedProductId(payload.id);
  };

  const handleCreateMovement = (event: React.FormEvent) => {
    event.preventDefault();
    if (!movementFormValid) {
      notifyError('Corrige los campos del movimiento antes de guardar.');
      return;
    }

    addMovement({
      productId: Number(movementForm.productId),
      tipo: movementForm.tipo,
      cantidad: Number(movementForm.cantidad),
      canal: movementForm.canal,
      fecha: movementForm.fecha,
    });

    setMovementForm(current => ({ ...current, cantidad: '', canal: 'Bodega' }));
    success('Movimiento de stock registrado correctamente.');
  };

  const handleExportExcel = () => {
    const rows = products.map(product => ({
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
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogo');
    XLSX.writeFile(workbook, 'catalogo-inventario-cercotec.xlsx');
    setExportMessage('Catálogo exportado a Excel correctamente.');
    success('Catálogo exportado a Excel correctamente.');
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
    setPreview(null);
    setExportMessage(`Importación simulada completada desde ${preview.rawName}.`);
  };

  const openPurchaseDraft = (product: Product) => {
    const supplier = findSupplierByProduct(product);
    const suggestedQuantity = Math.max(
      product.stockMinimo * 2 - product.stockActual,
      product.stockMinimo
    );
    setPurchaseDraft({
      productId: product.id,
      cantidad: suggestedQuantity,
      proveedor: supplier?.nombre ?? product.proveedor,
      nota: `Reponer ${product.nombre} por stock bajo.`,
    });
  };

  const savePurchaseDraft = () => {
    if (!purchaseDraft) return;
    success(`Importación simulada completada desde ${preview.rawName}.`);
    setExportMessage(`Orden de compra sugerida creada para ${purchaseDraft.proveedor}.`);
    success(`Orden de compra creada para ${purchaseDraft.proveedor}.`);
    setPurchaseDraft(null);
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
    setActiveTab('catalogo');
    info(`Editando ${product.nombre}.`);
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setProductForm(initialProductForm);
    info('Edición de producto cancelada.');
  };

  const confirmDeleteProduct = (product: Product) => {
    const accepted = window.confirm(
      `¿Eliminar ${product.nombre}? Esta acción no se puede deshacer.`
    );
    if (!accepted) return;
    deleteProduct(product.id);
    if (selectedProductId === product.id) {
      setSelectedProductId(products[0]?.id ?? 0);
    }
    success(`Producto ${product.nombre} eliminado correctamente.`);
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-blue-100">Control de Inventario</p>
            <h2 className="text-3xl font-semibold">Catálogo, movimientos y alertas de stock</h2>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm">
            {lowStockCount} productos bajo mínimo · alerta visible en sidebar
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Productos activos"
          value={`${totals.active}`}
          tone="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Bajo stock mínimo"
          value={`${totals.underMin}`}
          tone="bg-rose-50 text-rose-700"
        />
        <StatCard
          title="Valor del inventario"
          value={currency(totals.totalValue)}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          title="Movimientos registrados"
          value={`${movements.length}`}
          tone="bg-slate-50 text-slate-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Catálogo de productos</h3>
              <p className="text-sm text-slate-500">
                SKU, precios por canal, stock mínimo configurable y estado del producto.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportExcel}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Exportar Excel
              </button>
              <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Importar CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileSelection}
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-2 border-b border-slate-200">
            <TabButton
              active={activeTab === 'catalogo'}
              onClick={() => setActiveTab('catalogo')}
              label="Catálogo"
            />
            <TabButton
              active={activeTab === 'movimientos'}
              onClick={() => setActiveTab('movimientos')}
              label="Movimientos"
            />
            <TabButton
              active={activeTab === 'proveedores'}
              onClick={() => setActiveTab('proveedores')}
              label="Proveedores"
            />
          </div>

          {activeTab === 'catalogo' && (
            <>
              <form onSubmit={handleCreateProduct} className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {editingProductId ? 'Editar producto' : 'Nuevo producto'}
                    </h4>
                    <p className="text-sm text-slate-500">
                      Crea o edita un producto del catálogo de closet.
                    </p>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    8 productos base cargados
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <TextField
                    label="SKU"
                    value={productForm.sku}
                    onChange={value => setProductForm(current => ({ ...current, sku: value }))}
                    error={productErrors.sku}
                  />
                  <TextField
                    label="Nombre"
                    value={productForm.nombre}
                    onChange={value => setProductForm(current => ({ ...current, nombre: value }))}
                    error={productErrors.nombre}
                  />
                  <SelectField
                    label="Categoría"
                    value={productForm.categoria}
                    options={categoryOptions}
                    onChange={value =>
                      setProductForm(current => ({
                        ...current,
                        categoria: value as ProductCategory,
                      }))
                    }
                    error={productErrors.categoria}
                  />
                  <TextField
                    label="Proveedor"
                    value={productForm.proveedor}
                    onChange={value =>
                      setProductForm(current => ({ ...current, proveedor: value }))
                    }
                    error={productErrors.proveedor}
                  />
                  <TextField
                    label="Costo de compra"
                    type="number"
                    value={productForm.costoCompra}
                    onChange={value =>
                      setProductForm(current => ({ ...current, costoCompra: value }))
                    }
                    error={productErrors.costoCompra}
                  />
                  <TextField
                    label="Precio ML"
                    type="number"
                    value={productForm.precioML}
                    onChange={value => setProductForm(current => ({ ...current, precioML: value }))}
                    error={productErrors.precioML}
                  />
                  <TextField
                    label="Precio sitio web"
                    type="number"
                    value={productForm.precioSitioWeb}
                    onChange={value =>
                      setProductForm(current => ({ ...current, precioSitioWeb: value }))
                    }
                    error={productErrors.precioSitioWeb}
                  />
                  <TextField
                    label="Precio Estado"
                    type="number"
                    value={productForm.precioEstado}
                    onChange={value =>
                      setProductForm(current => ({ ...current, precioEstado: value }))
                    }
                    error={productErrors.precioEstado}
                  />
                  <TextField
                    label="Stock actual"
                    type="number"
                    value={productForm.stockActual}
                    onChange={value =>
                      setProductForm(current => ({ ...current, stockActual: value }))
                    }
                    error={productErrors.stockActual}
                  />
                  <TextField
                    label="Stock mínimo"
                    type="number"
                    value={productForm.stockMinimo}
                    onChange={value =>
                      setProductForm(current => ({ ...current, stockMinimo: value }))
                    }
                    error={productErrors.stockMinimo}
                  />
                  <TextField
                    label="Unidad de medida"
                    value={productForm.unidadMedida}
                    onChange={value =>
                      setProductForm(current => ({ ...current, unidadMedida: value }))
                    }
                    error={productErrors.unidadMedida}
                  />
                  <SelectField
                    label="Estado"
                    value={productForm.estado}
                    options={statusOptions}
                    onChange={value =>
                      setProductForm(current => ({ ...current, estado: value as ProductStatus }))
                    }
                    error={productErrors.estado}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-500">
                    La validación de mínimos se actualiza automáticamente en el sidebar.
                  </div>
                  <div className="flex gap-2">
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancelar edición
                      </button>
                    )}
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      {editingProductId ? 'Actualizar producto' : 'Guardar producto'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3">Proveedor</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Mínimo</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {products.map(product => {
                        const isLow =
                          product.estado === 'activo' && product.stockActual <= product.stockMinimo;
                        return (
                          <tr
                            key={product.id}
                            className={selectedProductId === product.id ? 'bg-blue-50/60' : ''}
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">{product.sku}</td>
                            <td className="px-4 py-3 text-slate-700">{product.nombre}</td>
                            <td className="px-4 py-3 text-slate-600">{product.categoria}</td>
                            <td className="px-4 py-3 text-slate-600">{product.proveedor}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
                              >
                                {product.stockActual} {product.unidadMedida}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{product.stockMinimo}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {product.estado}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setSelectedProductId(product.id)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Ver detalle
                                </button>
                                <button
                                  onClick={() => startEditProduct(product)}
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => confirmDeleteProduct(product)}
                                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                  Eliminar
                                </button>
                                {isLow && (
                                  <button
                                    onClick={() => openPurchaseDraft(product)}
                                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                                  >
                                    Crear orden de compra
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'movimientos' && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={handleCreateMovement} className="rounded-2xl bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-900">Registrar movimiento</h4>
                <p className="mb-4 text-sm text-slate-500">
                  Tipos: entrada, salidas por canal, ajuste y merma.
                </p>
                <div className="space-y-3">
                  <SelectField
                    label="Producto"
                    value={movementForm.productId}
                    options={products.map(product => ({
                      label: formatProductLabel(product),
                      value: String(product.id),
                    }))}
                    onChange={value =>
                      setMovementForm(current => ({ ...current, productId: value }))
                    }
                    error={movementErrors.productId}
                  />
                  <SelectField
                    label="Tipo"
                    value={movementForm.tipo}
                    options={movementOptions}
                    onChange={value =>
                      setMovementForm(current => ({ ...current, tipo: value as MovementType }))
                    }
                    error={movementErrors.tipo}
                  />
                  <TextField
                    label="Cantidad"
                    type="number"
                    value={movementForm.cantidad}
                    onChange={value =>
                      setMovementForm(current => ({ ...current, cantidad: value }))
                    }
                    error={movementErrors.cantidad}
                  />
                  <TextField
                    label="Canal"
                    value={movementForm.canal}
                    onChange={value => setMovementForm(current => ({ ...current, canal: value }))}
                    error={movementErrors.canal}
                  />
                  <TextField
                    label="Fecha"
                    type="date"
                    value={movementForm.fecha}
                    onChange={value => setMovementForm(current => ({ ...current, fecha: value }))}
                    error={movementErrors.fecha}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Guardar movimiento
                  </button>
                </div>
              </form>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="font-semibold text-slate-900">Historial reciente</h4>
                <div className="mt-4 max-h-[560px] space-y-3 overflow-auto pr-1">
                  {movements.map(movement => {
                    const product = products.find(item => item.id === movement.productId);
                    return (
                      <div
                        key={movement.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">
                              {product?.nombre ?? 'Producto eliminado'}
                            </div>
                            <div className="text-sm text-slate-500">{movement.tipo}</div>
                          </div>
                          <div className="text-right text-sm font-semibold text-slate-900">
                            {movement.cantidad}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{formatDate(movement.fecha)}</span>
                          <span>·</span>
                          <span>{movement.canal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proveedores' && (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {suppliers.map(supplier => (
                <div
                  key={supplier.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{supplier.nombre}</h4>
                      <p className="text-sm text-slate-500">RUT: {supplier.rut}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {supplier.tiempoEntregaPromedio}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">Contacto: {supplier.contacto}</div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Productos
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {supplier.productos.map(product => (
                      <span
                        key={product}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Alertas de stock mínimo</h3>
                <p className="text-sm text-slate-500">
                  Productos bajo mínimo con acceso rápido a compra.
                </p>
              </div>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                {lowStockCount}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {lowStockSorted.map(product => {
                const supplier = findSupplierByProduct(product);
                return (
                  <div
                    key={product.id}
                    className="rounded-xl border border-rose-100 bg-rose-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{product.nombre}</div>
                        <div className="text-sm text-slate-500">
                          Stock {product.stockActual} / mínimo {product.stockMinimo}
                        </div>
                      </div>
                      <button
                        onClick={() => openPurchaseDraft(product)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
                      >
                        Crear OC
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Proveedor sugerido: {supplier?.nombre ?? product.proveedor}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {purchaseDraft && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Orden de compra rápida</h3>
              <p className="text-sm text-slate-500">Generada desde la alerta de stock mínimo.</p>
              <div className="mt-4 space-y-3">
                <SelectField
                  label="Proveedor"
                  value={purchaseDraft.proveedor}
                  options={suppliers.map(supplier => supplier.nombre)}
                  onChange={value =>
                    setPurchaseDraft(current =>
                      current ? { ...current, proveedor: value } : current
                    )
                  }
                />
                <TextField
                  label="Cantidad sugerida"
                  type="number"
                  value={String(purchaseDraft.cantidad)}
                  onChange={value =>
                    setPurchaseDraft(current =>
                      current ? { ...current, cantidad: Number(value) } : current
                    )
                  }
                />
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  {purchaseDraft.nota}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={savePurchaseDraft}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Confirmar OC
                  </button>
                  <button
                    onClick={() => setPurchaseDraft(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Vista detalle</h3>
            {selectedProduct ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    SKU
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{selectedProduct.sku}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado de stock
                  </div>
                  <div
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${selectedProduct.stockActual <= selectedProduct.stockMinimo ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
                  >
                    {selectedProduct.stockActual <= selectedProduct.stockMinimo
                      ? 'Bajo mínimo'
                      : 'Saludable'}
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-slate-600">
                  <DetailLine label="Precio ML" value={currency(selectedProduct.precioML)} />
                  <DetailLine
                    label="Precio sitio web"
                    value={currency(selectedProduct.precioSitioWeb)}
                  />
                  <DetailLine
                    label="Precio Estado"
                    value={currency(selectedProduct.precioEstado)}
                  />
                  <DetailLine label="Proveedor" value={selectedProduct.proveedor} />
                </div>
                <button
                  onClick={() => openPurchaseDraft(selectedProduct)}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Crear orden de compra desde detalle
                </button>
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-500">No hay un producto seleccionado.</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Importación CSV simulada</h3>
            <p className="text-sm text-slate-500">
              Carga un archivo CSV con encabezados del catálogo, revisa la previsualización y
              confirma la importación.
            </p>
            {exportMessage && (
              <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {exportMessage}
              </div>
            )}
            {preview ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  Archivo: {preview.rawName}
                </div>
                <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {preview.rows.map(row => (
                        <tr key={row.id}>
                          <td className="px-3 py-2">{row.sku}</td>
                          <td className="px-3 py-2">{row.nombre}</td>
                          <td className="px-3 py-2">{row.stockActual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Confirmar importación
                  </button>
                  <button
                    onClick={() => setPreview(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Selecciona un CSV para ver la previsualización antes de confirmar.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

const parseCsv = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line, delimiter);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
};

const splitCsvLine = (line: string, delimiter: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
  >
    {label}
  </button>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
}> = ({ label, value, onChange, type = 'text', error }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
    />
    {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
  </label>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
  error?: string;
}> = ({ label, value, onChange, options, error }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
    >
      {options.map(option => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
    {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
  </label>
);

const StatCard: React.FC<{ title: string; value: string; tone: string }> = ({
  title,
  value,
  tone,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {title}
    </div>
    <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
  </div>
);

const DetailLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

const validateProductForm = (
  form: ProductForm,
  products: Product[],
  editingProductId: number | null
) => {
  const errors: Partial<Record<keyof ProductForm, string>> = {};

  if (!form.sku.trim()) errors.sku = 'El SKU es obligatorio.';
  else {
    const duplicate = products.some(
      product =>
        product.sku.toLowerCase() === form.sku.trim().toLowerCase() &&
        product.id !== editingProductId
    );
    if (duplicate) errors.sku = 'Ya existe un producto con este SKU.';
  }

  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!form.categoria) errors.categoria = 'Selecciona una categoría.';
  if (!form.proveedor.trim()) errors.proveedor = 'El proveedor es obligatorio.';

  if (!isPositiveNumber(form.costoCompra))
    errors.costoCompra = 'Ingresa un costo de compra mayor a 0.';
  if (!isPositiveNumber(form.precioML))
    errors.precioML = 'Ingresa un precio válido para Mercado Libre.';
  if (!isPositiveNumber(form.precioSitioWeb))
    errors.precioSitioWeb = 'Ingresa un precio válido para el sitio web.';
  if (!isPositiveNumber(form.precioEstado))
    errors.precioEstado = 'Ingresa un precio válido para Estado.';
  if (!isNonNegativeInteger(form.stockActual))
    errors.stockActual = 'El stock actual debe ser un entero igual o mayor a 0.';
  if (!isNonNegativeInteger(form.stockMinimo))
    errors.stockMinimo = 'El stock mínimo debe ser un entero igual o mayor a 0.';
  if (!form.unidadMedida.trim()) errors.unidadMedida = 'La unidad de medida es obligatoria.';
  if (!form.estado) errors.estado = 'Selecciona un estado.';

  return errors;
};

const validateMovementForm = (form: MovementForm) => {
  const errors: Partial<Record<keyof MovementForm, string>> = {};

  if (!form.productId) errors.productId = 'Selecciona un producto.';
  if (!form.tipo) errors.tipo = 'Selecciona un tipo de movimiento.';
  if (!isPositiveNumber(form.cantidad)) errors.cantidad = 'La cantidad debe ser mayor a 0.';
  if (!form.canal.trim()) errors.canal = 'El canal es obligatorio.';
  if (!form.fecha) errors.fecha = 'La fecha es obligatoria.';

  return errors;
};

const isPositiveNumber = (value: string) => Number(value) > 0 && Number.isFinite(Number(value));

const isNonNegativeInteger = (value: string) =>
  Number.isInteger(Number(value)) && Number(value) >= 0;

export default Inventory;
