
import React, { useEffect, useState, useCallback } from 'react';

import './ContactPanel.scss';

import { getContact } from 'dx-template-gallery-data';
import { ITotalProfit } from '@/types/totalProfit';
import { withLoadPanel } from '../../../utils/withLoadPanel';

import { ContactPanelDetails } from './ContactPanelDetails';

const ContactPanelWithLoadPanel = withLoadPanel(ContactPanelDetails);

export const ContactPanel = ({ contactId, isOpened, changePanelOpened, changePanelPinned } : { contactId: number | null, isOpened: boolean, changePanelOpened:(value: boolean)=> void, changePanelPinned: () => void }) => {

  const [data, setData] = useState<ITotalProfit>();

  const loadData = useCallback(() => {
    if (!contactId) return;

    getContact(contactId)
      .then((data) => {
        setData(data);
      })
      .catch((error) => console.log(error));
  }, [contactId]);

  const onDataChanged = useCallback(data => {
    setData(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <ContactPanelWithLoadPanel
      key={data?.JobNo}
      contact={data}
      hasData={!!data}
      isOpened={isOpened}
      onDataChanged={onDataChanged}
      changePanelOpened={changePanelOpened}
      changePanelPinned={changePanelPinned}
      panelProps={{
        position: { of: '.panel' },
        container: '.panel'
      }}
    />
  );
};

