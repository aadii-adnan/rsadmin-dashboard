import React from 'react'

const Step4BookingForm = () => {
  return (
    <fieldset className="fieldset active">
        <div className="form-card">
        <div className="row">
            <div className="col-7">
            <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>
                Finish:
            </h2>
            </div>
            <div className="col-5">
            <h2 className="steps" style={{ fontSize: "16px", color: "#555", marginBottom: "20px" }}>
                Step 4 - 4
            </h2>
            </div>
        </div>
        <h2 className="purple-text text-center" style={{ fontSize: "24px", fontWeight: "bold", color: "#6a1b9a", marginBottom: "20px" }}>
            SUCCESS!
        </h2>
        <div className="row justify-content-center">
            <div className="col-3">
            <img
                src="https://i.imgur.com/GwStPmg.png"
                className="fit-image"
                alt="success"
                style={{
                width: "100%",
                borderRadius: "10px",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
                }}
            />
            </div>
        </div>
        <div className="row justify-content-center">
            <div className="col-7 text-center">
            <h5 className="purple-text text-center" style={{ fontSize: "18px", fontWeight: "bold", color: "#6a1b9a", marginTop: "20px" }}>
                You Have Successfully Signed Up
            </h5>
            </div>
        </div>
        </div>
    </fieldset>
  )
}

export default Step4BookingForm