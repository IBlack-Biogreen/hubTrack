import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Grid } from '@mui/material';

interface GridCardProps<T> {
  item: T;
  displayNameKey: keyof T;
  secondaryKey?: keyof T;
  onClick: (item: T) => void;
  buttonColor?: string;
  isLightColor?: (color: string) => boolean;
}

/**
 * GridCard Component
 * 
 * A reusable component for displaying selectable cards in a grid layout,
 * following the pattern used in TrackingSequence for organizations, departments, and feed types.
 */
function GridCard<T>({
  item,
  displayNameKey,
  secondaryKey,
  onClick,
  buttonColor,
  isLightColor = () => true,
}: GridCardProps<T>) {
  const displayName = String(item[displayNameKey] || '');
  const secondaryText = secondaryKey ? String(item[secondaryKey] || '') : '';
  
  const cardStyle = buttonColor 
    ? { 
        bgcolor: `#${buttonColor}`, 
        color: isLightColor(buttonColor) ? '#000' : '#fff' 
      } 
    : {};
  
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card sx={cardStyle}>
        <CardActionArea onClick={() => onClick(item)}>
          <CardContent>
            <Typography variant="h6">{displayName}</Typography>
            {secondaryKey && (
              <Typography variant="body2" color={buttonColor ? 'inherit' : 'text.secondary'}>
                {secondaryText}
              </Typography>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
}

/**
 * GridCardList Component
 * 
 * A reusable component for displaying a grid of selectable cards,
 * following the pattern used in TrackingSequence.
 */
interface GridCardListProps<T> {
  items: T[];
  displayNameKey: keyof T;
  secondaryKey?: keyof T;
  onSelect: (item: T) => void;
  getButtonColor?: (item: T) => string | undefined;
  isLightColor?: (color: string) => boolean;
}

function GridCardList<T>({
  items,
  displayNameKey,
  secondaryKey,
  onSelect,
  getButtonColor,
  isLightColor = () => true,
}: GridCardListProps<T>) {
  return (
    <Grid container spacing={2}>
      {items.map((item, index) => (
        <GridCard
          key={index}
          item={item}
          displayNameKey={displayNameKey}
          secondaryKey={secondaryKey}
          onClick={onSelect}
          buttonColor={getButtonColor ? getButtonColor(item) : undefined}
          isLightColor={isLightColor}
        />
      ))}
    </Grid>
  );
}

export { GridCard, GridCardList };
export type { GridCardProps, GridCardListProps }; 