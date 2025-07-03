import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { Button, ButtonTypes } from 'devextreme-react/button';
import { ScrollView } from 'devextreme-react/scroll-view';
import Toolbar, { Item as ToolbarItem } from 'devextreme-react/toolbar';
import Form, {
  GroupItem,
  ColCountByScreen,
} from 'devextreme-react/form';
import Accordion, { Item as AccordionItem } from 'devextreme-react/accordion';
import { formatNumber } from 'devextreme/localization';
import { ITotalProfit } from '@/types/totalProfit';
import { useScreenSize } from '../../../utils/media-query';
import ValidationGroup from 'devextreme-react/validation-group';

const renderCustomTitle = (item) => {
  return (
    <>
      <span>{item.title}</span>
    </>
  );
};

const formatPrice = (price) => {
  return formatNumber(price, {
    type: 'currency',
    currency: 'USD',
  });
};

export const ContactPanelDetails = ({
  contact,
  isOpened,
  changePanelOpened,
  onDataChanged,
  changePanelPinned,
}: {
  contact: ITotalProfit;
  isOpened: boolean;
  changePanelOpened: (value: boolean) => void;
  onDataChanged: (data) => void;
  changePanelPinned: () => void;
}) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { isLarge, isMedium } = useScreenSize();

  const navigate = useNavigate();
  const [formData, setFormData] = useState(contact);

  useEffect(() => {
    changePanelPinned();
  }, [isPinned]);

  const onPinClick = useCallback(() => {
    setIsPinned(!isPinned);
  }, [isPinned]);

  const onClosePanelClick = useCallback(() => {
    setIsPinned(false);
    changePanelOpened(false);
  }, []);

  const toggleEditHandler = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);

  const cancelHandler = useCallback(() => {
    toggleEditHandler();
    setFormData(contact);
  }, [contact, toggleEditHandler]);

  const onSaveClick = useCallback(
    ({ validationGroup }: ButtonTypes.ClickEvent) => {
      if (!validationGroup.validate().isValid) return;
      onDataChanged(formData);
      setIsEditing(!isEditing);
    },
    [formData, isEditing]
  );

  const navigateToDetails = useCallback(() => {
    navigate('/crm-contact-details');
  }, []);

  const renderCustomOpportunities = useCallback(() => {
    return contact.opportunities.map((item, idx) => {
      return (
        <div className='opportunities' key={idx}>
          <span className='value'>{item.name}</span>
          <br />
          <span className='value black small'>{formatPrice(item.price)}</span>
        </div>
      );
    });
  }, [contact]);

  return (
    <div
      id='contact-panel'
      className={classNames({
        panel: true,
        open: isOpened,
        pin: isPinned && (isLarge || isMedium),
      })}
    >
      <div className='data-wrapper'>
        <Toolbar className='panel-toolbar'>
          <ToolbarItem location='before'>
            <span className='contact-name value'>{contact?.ConsigneeName}</span>
          </ToolbarItem>
          <ToolbarItem location='after' visible={isLarge || isMedium}>
            <Button
              icon={isPinned ? 'pin' : 'unpin'}
              stylingMode='text'
              onClick={onPinClick}
            />
          </ToolbarItem>
          <ToolbarItem location='after'>
            <Button
              icon='close'
              stylingMode='text'
              onClick={onClosePanelClick}
            />
          </ToolbarItem>
        </Toolbar>
        <ScrollView className='panel-scroll'>
          <ValidationGroup>
            <div className='data-part border'>
              <Form
                className={classNames({
                  'plain-styled-form': true,
                  'view-mode': !isEditing,
                })}
              >
                <GroupItem colCount={2} cssClass='photo-row'>
                  <ColCountByScreen xs={2} />
                </GroupItem>
              </Form>
            </div>

            <div className='data-part data-part-toolbar border'>
              <Toolbar>
                <ToolbarItem location='after' visible={!isEditing}>
                  <Button
                    icon='edit'
                    text='Edit'
                    stylingMode='contained'
                    type='default'
                    onClick={toggleEditHandler}
                  />
                </ToolbarItem>
                <ToolbarItem location='after' visible={!isEditing}>
                  <Button
                    text='Details'
                    stylingMode='outlined'
                    type='normal'
                    onClick={navigateToDetails}
                  />
                </ToolbarItem>
                <ToolbarItem location='after' visible={isEditing}>
                  <Button
                    text='Save'
                    icon='save'
                    stylingMode='contained'
                    type='default'
                    onClick={onSaveClick}
                  />
                </ToolbarItem>
                <ToolbarItem location='after' visible={isEditing}>
                  <Button
                    text='Cancel'
                    stylingMode='outlined'
                    type='normal'
                    onClick={cancelHandler}
                  />
                </ToolbarItem>
                <ToolbarItem
                  location='before'
                  widget='dxDropDownButton'
                  options={{
                    text: 'Actions',
                    stylingMode: 'text',
                    dropDownOptions: { width: 'auto' },
                    width: 'auto',
                    items: ['Call', 'Send Fax', 'Send Email', 'Make a Meeting'],
                  }}
                />
              </Toolbar>
            </div>
          </ValidationGroup>
          <div className='data-part'>
            <Accordion multiple collapsible itemTitleRender={renderCustomTitle}>
              <AccordionItem
                title='Opportunities'
                render={renderCustomOpportunities}
              />
              <AccordionItem
                title='Activities'
              />
            </Accordion>
          </div>
        </ScrollView>
      </div>
    </div>
  );
};
