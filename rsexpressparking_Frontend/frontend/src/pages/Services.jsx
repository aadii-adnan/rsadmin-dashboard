import React, {useState, useEffect} from "react";
import ServiceModal from "../Components/Services/ServiceModal";
import ServicesItem from "../components/Services/ServicesItem";

const Services = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
	const [services, setServices] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchServices = async () => {
		try {
		  const response = await fetch("http://localhost:8000/api/services");
		  if (!response.ok) {
			throw new Error("Failed to fetch services");
		  }
		  const data = await response.json();
		  setServices(data);
		  setLoading(false);
		} catch (error) {
		  console.error("Error fetching services:", error);
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
		fetchServices();
	}, []);

	return loading ? "Loading..." : (
    <div style={{ padding: "40px 20px", backgroundColor: "#f8f9fa", minHeight: "100vh", }}>
      <h1 style={{ textAlign: "center", color: "#010659", marginBottom: "40px", fontSize: "36px", fontWeight: "700",}}>Select Parking Option</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto', width: "80%"}}>
        {services.map((service) => <ServicesItem key={service.id} service={service} openModal={openModal}/>)}
      </div>

      <ServiceModal isOpen={isModalOpen} onClose={closeModal} long_description={selectedService ? selectedService.long_description : ""}/>

    </div>
  );
};

export default Services;