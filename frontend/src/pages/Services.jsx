import React, {useState, useEffect} from "react";
import ServiceModal from "../components/Services/ServiceModal";
import ServicesItem from "../components/Services/ServicesItem";
import { Helmet } from "react-helmet-async";
import ServiceShimmer from "../components/Services/ServiceShimmer"
import ServicesDateEditor from "../components/Services/ServicesDateEditor";
import PopupDialog from "../components/Utility/PopupDialog";
import customFetch from "../auth/fetch";
import "../Services.css";

const Services = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);
  	const [selectedService, setSelectedService] = useState(null);
	const [services, setServices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isPopupOpen, setIsPopupOpen] = useState(false);
	const [popupMessage, setPopupMessage] = useState("");

	const fetchServices = async () => {
		try {
		  const response = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/services/`);
		  if (!response.ok) {
			throw new Error("Failed to fetch services");
		  }

		  const data = await response.json();
		  setServices(data);
		} catch (error) {
		  console.error("Error fetching services:", error);
		} finally {
		  setLoading(false);
		}
	};

	const openModal = (service) => {
		setSelectedService(service);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedService(null);
	};

	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "auto" });
		fetchServices();
	}, []);

	const isEvChargingService = (service) => {
		const combined = `${service?.name || ""} ${service?.slug || ""}`.toLowerCase();
		return combined.includes("ev charging") || combined.includes("ev-charging") || combined.includes("electric vehicle");
	};

	return (
		<>
		<Helmet>
			<title>Meet & Greet Dublin Airport Parking Services</title>
			<meta name="description" content="Forget the hassle of parking at the airport with RS Express Parking! Take the chance of enjoying seamless Meet & Greet Parking Service at Dublin Airport."/>
			<meta name="robots" content="index, follow"/>
			<link rel="canonical" href="https://rsexpressparking.com/services/"/>
			<meta property="og:title" content="Meet & Greet Dublin Airport Parking Services"/>
			<meta property="og:description" content="Enjoy stress-free, secure, and convenient Meet & Greet parking at Dublin Airport with RS Express Parking."/>
			<meta property="og:type" content="website"/>
			<meta property="og:url" content="https://rsexpressparking.com/services/"/>
			<meta property="og:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>
			<meta property="og:site_name" content="RS Express Parking"/>
			<meta property="og:locale" content="en_US"/>
			<meta name="twitter:card" content="summary_large_image"/>
			<meta name="twitter:title" content="Meet & Greet Dublin Airport Parking Services"/>
			<meta name="twitter:description" content="Book our professional Meet & Greet Parking Service at Dublin Airport for a seamless travel experience."/>
			<meta name="twitter:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>

		</Helmet>
		<div style={{ padding: "40px 20px", backgroundColor: "#f8f9fa", minHeight: "100vh", }}>
			<h1 className="services-heading" style={{ textAlign: "center", color: "#010659", marginBottom: "24px", fontSize: "36px", fontWeight: "700",}}>Select Parking Option</h1>
			<ServicesDateEditor />
			<div className="each-service" style={{ display: 'flex', gap: '20px', maxWidth: '1200px', margin: '0 auto'}}>
			{loading ? ([...Array(3)].map((_, index) => (<ServiceShimmer key={index} />))
			) : ( services
				.filter(service => service.website === "rsexpressparking" || service.website === "both")
				.filter(service => !isEvChargingService(service))
				.map((service, index) => (
					<ServicesItem key={service.id} service={service} openModal={openModal} index={index} setPopupMessage={setPopupMessage} setIsPopupOpen={setIsPopupOpen} />
				))
			)}
			</div>

			<ServiceModal isOpen={isModalOpen} onClose={closeModal} long_description={selectedService ? selectedService.long_description : ""}/>
			<PopupDialog isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} title="Invalid Parking Time" message={popupMessage}/>

		</div>
	</>
  );
};

export default Services;
