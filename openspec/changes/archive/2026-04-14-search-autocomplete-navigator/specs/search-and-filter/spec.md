## REMOVED Requirements

### Requirement: User can search Pokemon by name
**Reason**: Search-as-filter behavior replaced by autocomplete-dropdown navigation. Name matching logic moves to the dropdown component.
**Migration**: Use the new autocomplete dropdown to find Pokemon by name, then select to navigate.

### Requirement: User can search Pokemon by number
**Reason**: Search-as-filter behavior replaced by autocomplete-dropdown navigation. Number matching logic moves to the dropdown component.
**Migration**: Use the new autocomplete dropdown to find Pokemon by number, then select to navigate.

### Requirement: User can filter by generation
**Reason**: Generation filters are being removed entirely. The main view always shows the full collection.
**Migration**: No replacement. Users browse the full collection and use the autocomplete search to jump to specific Pokemon.

### Requirement: Search and filter combine with AND logic
**Reason**: With both search-as-filter and generation filters removed, combined filter logic is no longer applicable.
**Migration**: No replacement needed.

### Requirement: Filters apply to both list and binder views
**Reason**: There are no longer any filters to apply. Both views always show the full collection.
**Migration**: No replacement needed.
