import React, { useState } from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { GridCardList } from './GridCard';

interface DemoItem {
  id: string;
  displayName: string;
  name?: string;
  explanation?: string;
  buttonColor?: string;
}

/**
 * GridDemo Component
 * 
 * A demonstration component that shows how to use the GridCard and GridCardList components
 * with examples that match the usage in TrackingSequence.
 */
const GridDemo: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<DemoItem | null>(null);
  
  // Example data for organizations
  const organizations: DemoItem[] = [
    { id: '1', displayName: 'Embassy Suites Boulder', name: 'embassy_boulder' },
    { id: '2', displayName: 'Hilton Garden Inn', name: 'hilton_garden' },
    { id: '3', displayName: 'DoubleTree Resort', name: 'doubletree_resort' },
    { id: '4', displayName: 'Waldorf Astoria', name: 'waldorf_astoria' },
    { id: '5', displayName: 'Hampton Inn', name: 'hampton_inn' },
    { id: '6', displayName: 'Curio Collection', name: 'curio_collection' },
  ];
  
  // Example data for feed types
  const feedTypes: DemoItem[] = [
    { id: '1', displayName: 'Mix 🌱', explanation: 'Mixed food waste', buttonColor: '7EAA92' },
    { id: '2', displayName: 'Meat 🥩', explanation: 'Meat products', buttonColor: 'C14953' },
    { id: '3', displayName: 'Dairy 🥛', explanation: 'Dairy products', buttonColor: 'F5F0BB' },
    { id: '4', displayName: 'Produce 🥗', explanation: 'Fruits and vegetables', buttonColor: '88AB8E' },
    { id: '5', displayName: 'Bread 🍞', explanation: 'Bread and baked goods', buttonColor: 'EAD7BB' },
    { id: '6', displayName: 'Seafood 🐟', explanation: 'Seafood products', buttonColor: '569DAA' },
  ];
  
  // Logic to determine if a color is light or dark
  const isLightColor = (hexColor: string): boolean => {
    // Remove the # if it's there
    hexColor = hexColor.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate the brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return true if color is light
    return brightness > 128;
  };
  
  const handleSelectItem = (item: DemoItem) => {
    setSelectedItem(item);
  };
  
  const resetSelection = () => {
    setSelectedItem(null);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Grid Component Demo
      </Typography>
      
      {selectedItem && (
        <Alert 
          severity="success" 
          sx={{ mb: 4 }}
          action={
            <Button color="inherit" size="small" onClick={resetSelection}>
              Clear
            </Button>
          }
        >
          Selected: <strong>{selectedItem.displayName}</strong>
          {selectedItem.name && ` (${selectedItem.name})`}
          {selectedItem.explanation && ` - ${selectedItem.explanation}`}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Organization Selection Example
        </Typography>
        <Typography paragraph>
          This demonstrates the organization selection grid used in TrackingSequence.
        </Typography>
        
        <GridCardList
          items={organizations}
          displayNameKey="displayName"
          secondaryKey="name"
          onSelect={handleSelectItem}
        />
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Feed Type Selection Example
        </Typography>
        <Typography paragraph>
          This demonstrates the feed type selection grid with colored backgrounds used in TrackingSequence.
        </Typography>
        
        <GridCardList
          items={feedTypes}
          displayNameKey="displayName"
          secondaryKey="explanation"
          onSelect={handleSelectItem}
          getButtonColor={(item) => item.buttonColor}
          isLightColor={isLightColor}
        />
      </Paper>
    </Box>
  );
};

export default GridDemo; 