import React, {useState} from 'react'

const FAQItem = ({question, answer}) => {
    const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="elementskit-card ">
        <div style={{cursor:"pointer"}} onClick={() => setIsOpen(prev => !prev)} className="elementskit-card-header" id="primaryHeading-0-6f4e1865">
            <a className="ekit-accordion--toggler elementskit-btn-link collapsed" data-ekit-toggle="collapse" data-target="#Collapse-f2301cb680f68f99a080" aria-expanded="false" aria-controls="Collapse-f2301cb680f68f99a080">
                <span className="ekit-accordion-title">{question}</span>
                <div className="ekit_accordion_icon_group">
                    <div className="ekit_accordion_normal_icon">
                        
                        <i className="icon icon-plus"></i>                                    
                    </div>
                    <div className="ekit_accordion_active_icon">
                        
                        <i className="icon icon-cross"></i>                                    
                    </div>
                </div>
            </a>
        </div>
        {isOpen && <div id="Collapse-f2301cb680f68f99a080" aria-labelledby="primaryHeading-0-6f4e1865" data-parent="#accordion-680f68f99a080">
            <div className="elementskit-card-body ekit-accordion--content">
                <p>{answer}</p>
            </div>
        </div>}
    </div>
  )
}

export default FAQItem