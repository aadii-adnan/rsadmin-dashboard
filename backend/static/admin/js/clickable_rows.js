document.addEventListener('DOMContentLoaded', function() {
    const resultList = document.getElementById('result_list');
    if (resultList) {
        const tbody = resultList.querySelector('tbody');
        tbody.addEventListener('click', function(e) {
            const row = e.target.closest('tr');
            // Only proceed if click is not on a link, button, or input
            if (row && !e.target.closest('a') && !e.target.closest('input') && !e.target.closest('.button')) {
                // Get the ID cell (second cell with class field-id)
                const idCell = row.querySelector('th.field-id');
                if (idCell) {
                    const id = idCell.textContent.trim();
                    const currentPath = window.location.pathname;
                    // Remove trailing slash if present
                    const basePath = currentPath.replace(/\/$/, '');
                    // Navigate to the change form
                    window.location.href = `${basePath}/${id}/change/`;
                }
            }
        });
    }
});