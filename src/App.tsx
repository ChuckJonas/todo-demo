import React, { useCallback, useEffect, useState } from "react";
import { Card, DatePicker, Input, Form, Button, Layout } from "antd";
import "antd/dist/antd.css";
import moment, { Moment } from "moment";
import useInterval from 'use-interval';
import {debounce} from 'lodash';

// type alias can really help with readability, especially in function signatures & state structures
type EntryId = string;

type TimeEntry = {
  id: EntryId;
  notes: string;
  time: number;
  date: Moment;
};

// Map: id --> {changes}
type ChangedEntries =  Record<EntryId, Partial<TimeEntry>>;


// IRL this comes from server
const EXISTING_TE: TimeEntry[] = [
  {
    id: "1",
    notes: "GST: hello world",
    time: 0,
    date: moment(),
  },
  {
    id: "2",
    notes: "GST: another item",
    time: 0,
    date: moment(),
  },
];

/* APP */
interface AppProps {savedChanges: ChangedEntries, onSaveChanges: (changes: ChangedEntries) => void}

function App(props: AppProps) {
  const { savedChanges, onSaveChanges } = props;

  //=== STATE
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(EXISTING_TE);

  const [changes, setChanges] = useState<ChangedEntries>(
    savedChanges
  );
  
  const [currentDate, setCurrentDate] = useState<Moment | null>(moment());
  const [activeTimeEntry, setActiveTimeEntry] = useState<EntryId>();

  // === Persist "changes" whenever it updates
  useEffect(() => onSaveChanges(changes), [changes, onSaveChanges])

  //=== STATE HANDLERS
  const change = (id: EntryId, updates: Partial<TimeEntry>) => {
    // just keep track of the partial changes in a Record object
    const currentChanges = changes[id] || {};
    const newItem = { ...currentChanges, ...updates };
    const newState = { ...changes, [id]: newItem };
    setChanges(newState);
  };

  useInterval(() => {
    // probably not a great way to track time.  
    // Might be more reliable to track start time + id (EG: [2021-1-1T12:34:01, 1]) then copy over to "elapsed time" when item changes?
    // this also makes debouncing on state changes tough
    if(activeTimeEntry){
      const currentTime = changes[activeTimeEntry]?.time || timeEntries.find(te => te.id === activeTimeEntry)?.time || 0;
      change(activeTimeEntry, {time: currentTime + 1})
    }
  }, 1000);

  const start = (id: EntryId) => setActiveTimeEntry(id);
  const pause = () => setActiveTimeEntry(undefined);

  const clearChanges  = (id: EntryId) => {
    //delete from "changes" state
    const newChanges = {...changes};
    delete newChanges[id];
    setChanges(newChanges);
  }

  const revert = (id: EntryId) => {
    //pause if active
    if(activeTimeEntry === id){
      pause();
    }

    clearChanges(id);
  }

  const save = (id: EntryId) => {
    const existingItem = timeEntries.find(te => te.id === id);
    
    if(!changes[id] || !existingItem){
      return;
    }
  
    // IRL this would make callout, only then update "timeEntries" (or refetch from server after)
    const itemChanges = changes[id];
    const updatedItem = {...existingItem, ...itemChanges};

    setTimeEntries(timeEntries.map(te => te.id === id ? updatedItem : te ));
    //delete from "changes" state
    clearChanges(id);
  }

  // === DERIVED STATE
  const timeEntriesWithChanges = timeEntries
    .map((te) => {
      return changes[te.id] ? { ...te, ...changes[te.id] } : te;
    })
    .filter((te) => te.date.dayOfYear() === currentDate?.dayOfYear());

  // === ELEMENTS
  const add = <Button type="primary" onClick={console.log}>New</Button>;
  return (
    <Layout>
      <Layout.Content>
        <Card title="Time Entries" extra={add}>
          <Form.Item label="Selected Date">
            <DatePicker  value={currentDate} onChange={setCurrentDate} />
          </Form.Item>
          <TimeEntryList
            timeEntries={timeEntriesWithChanges}
            activeTimeEntry={activeTimeEntry}
            dirtyItems={Object.keys(changes)}
            onStart={start}
            onPause={pause}
            onChange={change}
            onSave={save}
            onRevert={revert}
          />
        </Card>
      </Layout.Content>
    </Layout>
  );
}

/* Time Entry List */

interface TimeEntryListProps {
  timeEntries: TimeEntry[];
  activeTimeEntry: EntryId | undefined;
  dirtyItems: EntryId[];
  onPause: () => void;
  onStart: (id: EntryId) => void;
  onChange: (id: EntryId, updates: Partial<TimeEntry>) => void;
  onSave: (id: EntryId) => void;
  onRevert: (id: EntryId) => void;
}

function TimeEntryList(props: TimeEntryListProps) {
  const { onPause, onStart, onChange, onSave, onRevert, timeEntries, activeTimeEntry, dirtyItems } = props;
  const teItems = timeEntries.map((te) => (
    <TimeEntry
      key={te.id}
      timeEntry={te}
      isActive={activeTimeEntry === te.id}
      isDirty={dirtyItems.includes(te.id)}
      onStart={() => onStart(te.id)}
      onChange={(updates) => onChange(te.id, updates)}
      onPause={onPause}
      onRevert={() => onRevert(te.id)}
      onSave={() => onSave(te.id)}
    />
  ));
  return <div>{teItems}</div>;
}


/* Time Entry Card */
interface TimeEntryProps {
  key: string;
  timeEntry: TimeEntry;
  isActive: boolean;
  isDirty: boolean;
  onPause: () => void;
  onStart: () => void;
  onChange: (updates: Partial<TimeEntry>) => void;
  onSave: () => void;
  onRevert: () => void;
}

function TimeEntry(props: TimeEntryProps) {
  const { onChange, onStart, onPause, onRevert, onSave, timeEntry, isActive, isDirty } = props;
  const { id, notes, date, time } = timeEntry;

  const actions = (
    <div>
      {!isActive && <Button type="primary" onClick={onStart}>Start</Button>}
      {isActive && <Button onClick={onPause}>Pause</Button>}
      {isDirty && <Button danger onClick={onRevert}>Revert</Button>}
      {isDirty && <Button onClick={onSave}>Save</Button>}
    </div>
  );

  return (
    <Card title={`Entry Id: ${id}${isDirty ? '*' : ''}`} type="inner" extra={actions}>
      <Form.Item label="Elapsed Time">{time}</Form.Item>
      <Form.Item label="Notes">
      <Input
        value={notes}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
      </Form.Item>
      <Form.Item label="Date">
      <DatePicker
        value={date}
        onChange={(d) => onChange({ date: d || undefined })}
      />
      </Form.Item>
    </Card>
  );
}

export default App;
