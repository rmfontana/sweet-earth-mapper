import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ChevronsUpDown, Check, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  id?: string;
  name: string;
  label?: string;
}

interface ComboBoxAddableProps {
  items: Item[];
  value: string;
  onSelect: (value: string) => void;
  onAddNew: (newValue: string) => void; // New prop to handle adding a new item
  placeholder: string;
}

const ComboBoxAddable: React.FC<ComboBoxAddableProps> = ({ items, value, onSelect, onAddNew, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const safeItems = Array.isArray(items) ? items : [];
  const selectedItem = safeItems.find((item) => item.name === value);

  // Filter items based on the query
  const filteredItems = query
    ? safeItems.filter(item => (item.label || item.name).toLowerCase().includes(query.toLowerCase()))
    : safeItems;

  // Check if the user's query is a new entry
  const isNewEntry = query.trim() !== '' && !safeItems.some(item => (item.label || item.name).toLowerCase() === query.trim().toLowerCase());

  const handleSelect = (currentValue: string) => {
    onSelect(currentValue);
    setOpen(false);
    setQuery(''); // Clear the query after selection
  };
  
  const handleAddNew = () => {
    if (isNewEntry) {
      onAddNew(query.trim());
      setOpen(false);
      setQuery(''); // Clear the query
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedItem ? (selectedItem.label || selectedItem.name) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-50 w-[300px] p-0 bg-popover">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {/* Display a specific message when a new entry can be added */}
            <CommandEmpty>
              {isNewEntry ? `Type a new entry and press "Enter"` : "No item found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id || item.name}
                  value={item.name}
                  onSelect={(currentValue) => handleSelect(currentValue)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label || item.name}
                </CommandItem>
              ))}
              {/* Conditional rendering for the "Add New" item */}
              {isNewEntry && (
                <CommandItem 
                  value={`add-new-${query}`} 
                  onSelect={handleAddNew}
                  className="flex items-center text-blue-600 cursor-pointer"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New: "{query}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ComboBoxAddable;
