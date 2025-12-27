import { useTranslation } from 'react-i18next';
import { Box, Button, Card, CardContent, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { Search as SearchIcon, Delete as DeleteIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { LogLevelSchema, LogCategorySchema, type LogLevel, type LogCategory } from '@languageforest/types';

interface LogsFilterProps {
  search: string;
  levelFilter: LogLevel | '';
  categoryFilter: LogCategory | '';
  onSearchChange: (search: string) => void;
  onLevelFilterChange: (level: LogLevel | '') => void;
  onCategoryFilterChange: (category: LogCategory | '') => void;
  onDeleteAll: () => void;
}

export default function LogsFilter({
  search,
  levelFilter,
  categoryFilter,
  onSearchChange,
  onLevelFilterChange,
  onCategoryFilterChange,
  onDeleteAll,
}: LogsFilterProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterIcon color='action' />
          <TextField
            size='small'
            placeholder={t('logs.search')}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <SearchIcon fontSize='small' />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size='small' sx={{ minWidth: 120 }}>
            <InputLabel>{t('logs.level')}</InputLabel>
            <Select value={levelFilter} label={t('logs.level')} onChange={e => onLevelFilterChange(e.target.value as LogLevel | '')}>
              <MenuItem value=''>{t('logs.all')}</MenuItem>
              {LogLevelSchema.options.map(level => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size='small' sx={{ minWidth: 120 }}>
            <InputLabel>{t('logs.category')}</InputLabel>
            <Select
              value={categoryFilter}
              label={t('logs.category')}
              onChange={e => onCategoryFilterChange(e.target.value as LogCategory | '')}
            >
              <MenuItem value=''>{t('logs.all')}</MenuItem>
              {LogCategorySchema.options.map(category => (
                <MenuItem key={category} value={category}>
                  {t(`logs.categories.${category}`, category)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant='outlined' color='error' size='small' startIcon={<DeleteIcon />} onClick={onDeleteAll}>
            {t('logs.deleteAll')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
