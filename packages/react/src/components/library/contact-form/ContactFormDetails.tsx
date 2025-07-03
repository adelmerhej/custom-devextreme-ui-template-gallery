import React from 'react';

import classNames from 'classnames';

import From, { Item as ItemForm, GroupItem, ColCountByScreen } from 'devextreme-react/form';
import SelectBox from 'devextreme-react/select-box';
import Button from 'devextreme-react/button';
import TextBox from 'devextreme-react/text-box';

import { FormPhoto } from '../../utils/form-photo/FormPhoto';
import { ContactStatus } from '../../utils/contact-status/ContactStatus';
import { FormTextbox } from '../../utils/form-textbox/FormTextbox';

import { ITotalProfit } from '@/types/totalProfit';
import { JOB_STATUS } from '../../../shared/constants';

const PHOTO_SIZE = 184;

const statusRender = (text: string) => (
  <div className='status-editor-field'>
    <ContactStatus text={text} showText={false} />
    <TextBox
      className={`status-contact status-${text.toLowerCase()}`}
      inputAttr={{ statusEditorInput: '' }}
      readOnly
      text={text}
      hoverStateEnabled={false}
    />
  </div>
);

const statusItemRender = (text: string) => <ContactStatus text={text} />;

export const ContactFromDetails = ({ data, editing, updateField }: {
  data: ITotalProfit, editing: boolean, updateField: (field: string | number) => (value: string | number) => void
}) => {
  const stylingMode = 'filled';
  return (
    <From
      className={classNames({ 'plain-styled-form': true, 'view-mode': !editing })}
      labelMode='floating'
    >
      <GroupItem colCount={2}>
        <ColCountByScreen xs={2} />
        <ItemForm>
          <FormPhoto link={data.image} size={PHOTO_SIZE} />
        </ItemForm>

        <GroupItem>
          <ItemForm>
            <SelectBox
              label='Status'
              width='100%'
              value={data.status}
              readOnly={!editing}
              items={JOB_STATUS}
              stylingMode={stylingMode}
              fieldRender={statusRender}
              itemRender={statusItemRender}
              onValueChange={updateField('status')}
            />
          </ItemForm>

          <ItemForm>
            <FormTextbox
              label='First Name'
              value={data.firstName}
              isEditing={!editing}
              onValueChange={updateField('firstName')}
            />
          </ItemForm>

          <ItemForm>
            <FormTextbox
              label='Last Name'
              value={data.lastName}
              isEditing={!editing}
              onValueChange={updateField('lastName')}
            />
          </ItemForm>
        </GroupItem>
      </GroupItem>

      <GroupItem colCount={4} caption='Contacts'>
        <ColCountByScreen xs={2} />
        <ItemForm>
          <FormTextbox
            label='State'
            value={data.state.stateShort}
            isEditing={!editing}
            onValueChange={updateField('state')}
          />
        </ItemForm>
      </GroupItem>

      <GroupItem colCount={2} cssClass='contact-fields-group'>
        <ColCountByScreen xs={2} />
        <ItemForm>
          <Button
            className='form-item-button'
            visible={!editing}
            text='Call'
            icon='tel'
            type='default'
            stylingMode='outlined'
          />
        </ItemForm>

        <ItemForm>
          <Button
            className='form-item-button'
            visible={!editing}
            text='Send Email'
            icon='email'
            type='default'
            stylingMode='outlined'
          />
        </ItemForm>
      </GroupItem>
    </From>
  );
};
