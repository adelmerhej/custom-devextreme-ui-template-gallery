import React, { useState, useRef, useEffect } from 'react';

import { ToolbarForm } from '../../utils/toolbar-form/ToolbarForm';
import { ContactFromDetails } from './ContactFormDetails';

import { withLoadPanel } from '../../../utils/withLoadPanel';

import { ITotalProfit } from '@/types/totalProfit';

import ValidationGroup from 'devextreme-react/validation-group';

import './ContactForm.scss';

const ContactFromDetailsWithLoadPanel = withLoadPanel(ContactFromDetails);

export const ContactForm = ({ data, isLoading = false }: { data?: ITotalProfit, isLoading: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(data);
  const dataRef = useRef<ITotalProfit>();

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleEditClick = () => {
    if(editing === false && formData) {
      dataRef.current = formData;
    } else {
      dataRef.current = undefined;
    }
    setEditing(!editing);
  };

  const onSaveClick = ({ validationGroup }) => {
    if (!validationGroup.validate().isValid) return;

    handleEditClick();
  };

  const onCancelClick = () => {
    setFormData(dataRef.current);
    handleEditClick();
  };

  const updateField = (field: string | number) => (value: string | number) => {
    if(!formData) return;
    if(field === 'state') {
      setFormData({ ...formData, ...{ [field]: { stateShort: value.toString() } } });
    } else {
      setFormData({ ...formData, ...{ [field]: value } });
    }
  };

  return (
    <div className='contact-form'>
      <ValidationGroup>
        <ToolbarForm toggleEditing={handleEditClick} onSaveClick={onSaveClick} editing={editing} onCancelClick={onCancelClick} />
        <ContactFromDetailsWithLoadPanel
          loading={isLoading}
          hasData={!!formData}
          data={formData}
          editing={editing}
          updateField={updateField}
          panelProps={{
            container: '.contact-form',
            position: { of: '.contact-form' },
          }}
        />
      </ValidationGroup>
    </div>
  );
};
