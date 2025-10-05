<script>
</script>

<template>
    <section class="search-filters">
        <div class="container">
            <div class="search-bar">
                <input type="text" class="form-control search-input"
                    placeholder="Search events by title, organizer, or description...">
            </div>

            <div class="filters-row">
                <select class="form-control filter-select">
                    <option value="">All Categories</option>
                    <option value="Technology">Technology</option>
                    <option value="Music">Music</option>
                    <option value="Business">Business</option>
                </select>

                <select class="form-control filter-select">
                    <option value="">All Prices</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                </select>

                <select class="form-control filter-select">
                    <option value="">Any Date</option>
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                </select>

                <input type="text" class="form-control filter-select" placeholder="Enter location...">
            </div>

            <div class="filter-options">
                <label class="checkbox-label">
                    <input type="checkbox">
                    <span class="checkbox-text">Show only free events</span>
                </label>
                <div class="results-count"> 0 events found</div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.search-filters {
    background-color: var(--color-surface);
    padding: var(--space-32) 0;
    border-bottom: 1px solid var(--color-border);
}

.search-bar {
    margin-bottom: var(--space-24);
}

.search-input {
    width: 100%;
    font-size: var(--font-size-lg);
    padding: var(--space-16);
    border-radius: var(--radius-lg);
}

.filters-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-16);
    margin-bottom: var(--space-20);
}

.filter-select {
    padding: var(--space-12);
    border-radius: var(--radius-base);
    font-size: var(--font-size-base);
}

.filter-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-16);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    margin: 0;
}

.checkbox-text {
    font-size: var(--font-size-base);
    color: var(--color-text);
}

.results-count {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
}
</style>