
import React, { useEffect, useState } from 'react';

import Form, { Item as FormItem, GroupItem, ColCountByScreen } from 'devextreme-react/form';
import { ITotalProfit } from '@/types/totalProfit';
import { FormTextbox, FormPhotoUploader } from '../..';
import { getSizeQualifier } from '../../../utils/media-query';

export const ContactNewForm = ({ initData, onDataChanged }: { initData: ITotalProfit, onDataChanged: (data) => void }) => {
  const [newContactData, setNewContactData] = useState<ITotalProfit>({ ...initData });

  useEffect(() => {
    setNewContactData({ ...initData });
  }, [initData]);

  const updateField = (field: string) => (value) => {
    const newData = { ...newContactData, ...{ [field]: value } };

    onDataChanged(newData);
    setNewContactData(newData);
  };

  return (
    <Form
      className='plain-styled-form'
      screenByWidth={getSizeQualifier}
    >
      <GroupItem>
        <ColCountByScreen xs={1} sm={1} md={1} lg={1} />
        <FormItem>
          <FormPhotoUploader />
        </FormItem>
      </GroupItem>

      <GroupItem>
        <ColCountByScreen xs={1} sm={2} md={2} lg={2} />
        <FormItem>
          <FormTextbox
            label='First Name'
            value={newContactData.firstName}
            isEditing={false}
            onValueChange={updateField('firstName')}
          />
        </FormItem>
        <FormItem>
          <FormTextbox
            label='Last Name'
            value={newContactData.lastName}
            isEditing={false}
            onValueChange={updateField('lastName')}
          />
        </FormItem>
      </GroupItem>

      <GroupItem cssClass='contact-fields-group'>
        <ColCountByScreen xs={1} sm={2} md={2} lg={2} />
      </GroupItem>
    </Form>
  );
};
