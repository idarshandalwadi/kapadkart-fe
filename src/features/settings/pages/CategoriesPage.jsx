import CatalogManagePage from '@/features/settings/pages/CatalogManagePage'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  bulkImportCategories,
} from '@/features/settings/api/catalog'

function CategoriesPage() {
  return (
    <CatalogManagePage
      title="Categories"
      lead="Manage category options available when adding or editing products."
      singularLabel="Category"
      placeholder="e.g. Sherwani"
      fetchItems={fetchCategories}
      createItem={createCategory}
      deleteItem={deleteCategory}
      bulkImportItems={bulkImportCategories}
    />
  )
}

export default CategoriesPage
