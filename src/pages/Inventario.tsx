import React from 'react';
import AnimatedNumber from '../components/AnimatedNumber';
import { formatCurrency } from '../lib/format';
import CatalogoTab from './inventario/components/CatalogoTab';
import ImportPreviewModal from './inventario/components/ImportPreviewModal';
import MovementModal from './inventario/components/MovementModal';
import MovimientosTab from './inventario/components/MovimientosTab';
import ProductModal from './inventario/components/ProductModal';
import ProveedoresTab from './inventario/components/ProveedoresTab';
import StockSidebar from './inventario/components/StockSidebar';
import SupplierModal from './inventario/components/SupplierModal';
import { StatCard, TabButton } from './inventario/components/ui';
import { useInventarioPage } from './inventario/useInventarioPage';

const Inventory: React.FC = () => {
  const vm = useInventarioPage();

  const exportLabel =
    vm.activeTab === 'catalogo'
      ? 'Exportar catálogo'
      : vm.activeTab === 'movimientos'
        ? 'Exportar movimientos'
        : 'Exportar proveedores';

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-amber-900/20 bg-[linear-gradient(135deg,_#1c1005_0%,_#6b3a1f_52%,_#c27d3a_100%)] px-6 py-5 text-white shadow-[0_24px_60px_rgba(120,53,15,0.22)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-amber-100">Control de Inventario</p>
            <h2 className="text-3xl font-semibold">Catálogo, movimientos y alertas de stock</h2>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm">
            {vm.lowStockCount} productos bajo mínimo · alerta visible en sidebar
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Productos activos"
          value={<AnimatedNumber value={vm.totals.active} className="tabular-nums" />}
          tone="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Bajo stock mínimo"
          value={<AnimatedNumber value={vm.totals.underMin} className="tabular-nums" />}
          tone="bg-rose-50 text-rose-700"
        />
        <StatCard
          title="Valor del inventario"
          value={<AnimatedNumber value={vm.totals.totalValue} format={formatCurrency} className="tabular-nums" />}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          title="Movimientos registrados"
          value={<AnimatedNumber value={vm.movements.length} className="tabular-nums" />}
          tone="bg-slate-50 text-slate-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Catálogo de productos</h3>
              <p className="text-sm text-slate-500">
                SKU, precios por canal, stock mínimo configurable y estado del producto.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={vm.handleExportExcel}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {exportLabel}
              </button>
              <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Importar CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={vm.handleFileSelection}
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex overflow-x-auto gap-2 border-b border-slate-200">
            <TabButton
              active={vm.activeTab === 'catalogo'}
              onClick={() => vm.setActiveTab('catalogo')}
              label="Catálogo"
            />
            <TabButton
              active={vm.activeTab === 'movimientos'}
              onClick={() => vm.setActiveTab('movimientos')}
              label="Movimientos"
            />
            <TabButton
              active={vm.activeTab === 'proveedores'}
              onClick={() => vm.setActiveTab('proveedores')}
              label="Proveedores"
            />
          </div>

          {vm.activeTab === 'catalogo' && <CatalogoTab vm={vm} />}
          {vm.activeTab === 'movimientos' && <MovimientosTab vm={vm} />}
          {vm.activeTab === 'proveedores' && <ProveedoresTab vm={vm} />}
        </div>

        <StockSidebar vm={vm} />
      </div>

      <ImportPreviewModal
        preview={vm.preview}
        onConfirm={vm.confirmImport}
        onCancel={() => vm.setPreview(null)}
      />

      <ProductModal
        open={vm.showProductModal}
        editingId={vm.editingProductId}
        form={vm.productForm}
        errors={vm.productErrors}
        valid={vm.productFormValid}
        suppliers={vm.suppliers}
        onChange={vm.handleProductFormChange}
        onSubmit={vm.handleCreateProduct}
        onCancel={vm.cancelEdit}
      />

      <MovementModal
        open={vm.showMovementModal}
        editingId={null}
        form={vm.movementForm}
        errors={vm.movementErrors}
        valid={vm.movementFormValid}
        products={vm.products}
        suppliers={vm.suppliers}
        onChange={vm.handleMovementFormChange}
        onSubmit={vm.handleCreateMovement}
        onCancel={vm.closeMovementModal}
      />

      <SupplierModal
        open={vm.showSupplierModal}
        editingId={vm.editingSupplierId}
        form={vm.supplierForm}
        errors={vm.supplierErrors}
        valid={vm.supplierFormValid}
        onChange={vm.handleSupplierFormChange}
        onSubmit={vm.handleSaveSupplier}
        onCancel={vm.cancelSupplierEdit}
      />
    </section>
  );
};

export default Inventory;
