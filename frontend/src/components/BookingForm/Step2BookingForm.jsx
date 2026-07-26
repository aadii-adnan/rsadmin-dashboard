import React, {useState, useEffect} from 'react'
import { useBooking } from "../../context/BookingContext";
import { clearAttribution, getAttribution } from "../../utils/attribution";
import 'react-international-phone/style.css';
import PopupDialog from "../Utility/PopupDialog";

const Step2BookingForm = ({formData, contactNo,  nextButtonStyle, serviceDetails, couponId, discountedPrice, totalPrice, goNext, statuses, goBack, prevButtonStyle, setFormData, addOnsDetails, setTotalPrice, selectedAddOns, setSelectedAddOns, setAddOnsDetails}) => {

    const { setBookingData, bookingData: { bookingDates: { parkingFromDate, parkingFromTime, carCollectionDate, carCollectionTime }, userDetails}, } = useBooking();
    const [error, setError] = useState(""); // State to store validation error messages
    const [isPopupOpen, setIsPopupOpen] = useState(false); // State for popup
    const [loading, setLoading] = useState(false); // Loading state
    const [addons, setAddons] = useState([]);

    useEffect(() => {
        const fetchAddOns = async () => {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/services/addons/`);
            const data = await response.json();
            const activeAddOns = Array.isArray(data)
              ? data.filter((addon) => addon.active !== false)
              : [];
            setAddons(activeAddOns);
          } catch (error) {
            console.error("Error fetching add-ons:", error);
          }
        };
        fetchAddOns();
        window.scrollTo(0, 300)
      }, []);

    useEffect(() => {
        setFormData((prev) => ({
        ...prev,
        add_ons: selectedAddOns,
        }));
    }, [selectedAddOns, setFormData]);

    const updateBookingUserStatus = async (bookingUserId) => {
      if (!bookingUserId) return;
      try {
        await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/bookings/booking-user/${bookingUserId}/status/`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking_completion_status: true }),
          }
        );
      } catch (err) {
        console.error("Failed to update booking user status", err);
      }
    };

    const handleAddOnChange = (addon) => {
        const isSelected = selectedAddOns.includes(addon.id);
    
        setSelectedAddOns((prev) =>
          isSelected ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
        );
    
        // Adjust total price
        setTotalPrice((prevTotal) =>
          isSelected
            ? Number(prevTotal) - Number(addon.price) // removing
            : Number(prevTotal) + Number(addon.price) // adding
        );
    
        setAddOnsDetails((prev) =>
          isSelected ? prev.filter((item) => item.id !== addon.id) : [...prev, addon]
        );
      };

    const validateInputs = () => {        
        if (totalPrice <= 0) {
          setError("Invalid price calculation");
          return false;
        }
        setError(""); // Clear error if validation passes
        return true;
    };

    const handleBooking = async (e) => {
        try {
            e.preventDefault();
            setLoading(true); // Set loading state to true
            if(!validateInputs())                
                return;

            const statusId = statuses.find((status) => status.name === formData.status_name && status.type === "booking")?.id;

            if (!statusId) {
                alert("Invalid status selected.");
                return;
            }

            if (!parkingFromDate || !carCollectionDate) {
                throw new Error("Invalid booking dates");
            }

            const bookingPayload = {
                ...formData,
                service: serviceDetails.id,
                user: userDetails?.id,
                contact_no: contactNo,
                departure_time: parkingFromDate + " " + parkingFromTime,
                return_time: carCollectionDate + " " + carCollectionTime,
                coupon: couponId,
                discounted_price : discountedPrice==0 ? totalPrice.toFixed(2) : discountedPrice.toFixed(2),                
                total_price: totalPrice.toFixed(2),
                status: statusId,
                website: "rsexpressparking",
                add_ons: selectedAddOns,
            };

            let response, data;
            const isNewBooking = !formData.booking_id;
            if (formData.booking_id) {
              // Update existing booking
              response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/bookings/${formData.booking_id}/`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(bookingPayload),
                }
              );
            } else {
              // Create new booking with the same attribution data as the active flow.
              response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bookings/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...bookingPayload, ...getAttribution() }),
              });
            }
            data = await response.json();

            if (response.ok) {
                if (isNewBooking) {
                  clearAttribution();
                }
                setFormData((prev) => ({
                    ...prev,
                    booking_id: data.id,
                  }));   
                setBookingData((prev) => ({
                    ...prev,
                    bookingDetails: {
                      ...prev.bookingDetails,
                      booking_id: data.id,
                      booking_unique_id: data?.booking_id,
                      total_price: totalPrice,
                    },
                    carFlightDetails: {
                      ...prev.carFlightDetails,
                      addOnsDetails: addOnsDetails,
                    },
                  }));
                if (formData.booking_user_id) {
                  await updateBookingUserStatus(formData.booking_user_id);
                }           
                goNext();
            } else {
                if (data.error === "Coupon has been fully used") {
                    setError(data.error);
                    setIsPopupOpen(true);
                    return;
                }
                setError(data.message || "An error occurred.");
                setIsPopupOpen(true);
            }
          } catch (error) {
            console.error("Error creating/updating booking:", error);
          } finally {
            setLoading(false);
          }
        };

  return (
    <>
    <fieldset className="fieldset active">
        <div className="form-card">            
        
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "5px", marginTop: "20px" }}>Extra Services:</h2>
            <p style={{ fontSize: "16px", color: "#555", marginBottom: "20px" }}>Select any additional services you would like to add:</p>
            {addons.map((addon) => (
                <div key={addon.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #ccc", borderRadius: "10px", padding: "10px", marginBottom: "10px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", }}>
                    <div className='addon-desc'>
                      <h6 style={{ margin: "0 0 5px 0", color: "#010659", fontWeight: "bold" }}>{addon.name.toUpperCase()}</h6>
                      <p style={{ margin: "0 0 5px 0", color: "#555", fontSize: "14px" }}>{addon.description}</p>
                    </div>
                    <div className='addon-price' style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: "bold", fontSize: "15px", color: "#2890cd", margin: "0 auto", textAlign: "center" }}>
                          €{addon.price}
                      </p>
                      <input
                          type="checkbox"
                          id={`addon-${addon.id}`}
                          checked={selectedAddOns.includes(addon.id)}
                          onChange={() => handleAddOnChange(addon)}
                          style={{ width: "18px", height: "18px", cursor: "pointer", marginTop: "10px" }}
                      />
                    </div>
                </div>
            ))}
            
        </div>
        <input type="button" className="next action-button" value={loading ? "loading..." : "Next"} onClick={async(e) => {await handleBooking(e); setLoading(false);}} style={nextButtonStyle} />
        <input type="button" className="previous action-button-previous" value="Back" onClick={goBack} style={prevButtonStyle} />
    </fieldset>

    {/* Popup Dialog */}
    <PopupDialog
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title=""
        message={error}
      />
    </>
  )
}

export default Step2BookingForm
