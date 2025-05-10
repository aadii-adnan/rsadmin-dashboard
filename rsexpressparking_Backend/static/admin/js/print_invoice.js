function printInvoice(url) {
    const printWindow = window.open(url);
    printWindow.onload = function() {
        printWindow.print();
    };
    return false;
}

function printBookingForm(url) {
    const printWindow = window.open(url);
    printWindow.onload = function() {
        printWindow.print();
    };
    return false;
}