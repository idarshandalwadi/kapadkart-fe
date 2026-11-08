import CatalogManagePage from '@/features/settings/pages/CatalogManagePage'
import {
  createBrand,
  deleteBrand,
  fetchBrands,
  bulkImportBrands,
} from '@/features/settings/api/catalog'

function BrandsPage() {
  return (
    <CatalogManagePage
      title="Brands"
      lead="Manage brand options available when adding or editing products."
      singularLabel="Brand"
      placeholder="e.g. Manyavar"
      fetchItems={fetchBrands}
      createItem={createBrand}
      deleteItem={deleteBrand}
      bulkImportItems={bulkImportBrands}
    />
  )
}

export default BrandsPage
