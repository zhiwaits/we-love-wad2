<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'Search',

  computed: {
    ...mapState(['filters', 'categories']),
    ...mapGetters(['allTags', 'allVenues', 'resultsCount']),
    ...mapGetters('clubs', {
      clubCategoryOptions: 'categoryOptions',
      followedClubIds: 'followingClubIds'
    }),

    searchQuery: {
      get() {
        return this.filters.searchQuery;
      },
      set(value) {
        this.updateSearch(value);
      }
    },

    eventStatus: {
      get() {
        return this.filters.eventStatus;
      },
      set(value) {
        this.updateEventStatus(value);
      }
    },

    dateFilter: {
      get() {
        return this.filters.dateFilter;
      },
      set(value) {
        this.updateDateFilter(value);
      }
    },

    specificDate: {
      get() {
        return this.filters.specificDate;
      },
      set(value) {
        this.setSpecificDate(value);
      }
    },

    venueFilter: {
      get() {
        return this.filters.venueFilter;
      },
      set(value) {
        this.updateVenueFilter(value);
      }
    },

    locationQuery: {
      get() {
        return this.filters.locationQuery;
      },
      set(value) {
        .search-filters {
          background-color: var(--color-bg-1);
          padding: var(--space-32) 0;
        }

        .filters-card {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-24);
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-24);
        }

        .filters-header {
          display: flex;
          align-items: center;
        }

        .search-input {
          width: 100%;
          font-size: var(--font-size-lg);
          padding: var(--space-14) var(--space-20);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
          background-color: var(--color-surface);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15);
        }

        .filters-divider {
          height: 1px;
          background-color: var(--color-border);
          opacity: 0.6;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-20);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
        }

        .filter-group--full {
          grid-column: 1 / -1;
        }

        .filter-label {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-secondary);
          letter-spacing: 0.01em;
        }

        .filter-select,
        .filter-input {
          padding: var(--space-12) var(--space-14);
          border-radius: var(--radius-md);
          font-size: var(--font-size-base);
          border: 1px solid var(--color-border);
          background-color: var(--color-surface);
          transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
        }

        .price-range {
          display: flex;
          align-items: center;
          gap: var(--space-12);
        }

        .price-range__divider {
          color: var(--color-text-secondary);
          font-size: var(--font-size-base);
        }

        .filters-secondary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--space-20);
        }

        .chip-group {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-10);
        }

        .chip {
          padding: var(--space-8) var(--space-16);
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
          background-color: var(--color-surface);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          transition: all var(--duration-fast) var(--ease-standard);
        }

        .chip:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .chip--active {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-white);
          box-shadow: 0 6px 14px -6px rgba(25, 118, 210, 0.45);
        }

        .club-controls {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-12);
          align-items: center;
        }

        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: var(--space-8);
          cursor: pointer;
          user-select: none;
          font-size: var(--font-size-sm);
          color: var(--color-text);
        }

        .checkbox-label--disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        .checkbox-text {
          font-size: var(--font-size-sm);
        }

        .helper-text {
          display: inline-block;
          margin-left: var(--space-4);
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary, var(--color-text-secondary));
        }

        .filters-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--space-16);
        }

        .filters-footer__reset {
          border-radius: var(--radius-md);
          padding: var(--space-10) var(--space-20);
          font-size: var(--font-size-sm);
          transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard);
        }

        .filters-footer__reset:hover {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-white);
        }

        .results-count {
          font-size: var(--font-size-base);
          color: var(--color-text-secondary);
          font-weight: var(--font-weight-medium);
        }

        .results-count strong {
          color: var(--color-text);
          font-weight: var(--font-weight-semibold);
        }

        @media (max-width: 768px) {
          .filters-card {
            padding: var(--space-20);
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .filters-secondary {
            grid-template-columns: 1fr;
          }

          .filters-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
              type="number"
              min="0"
              class="form-control filter-input"
              placeholder="Min"
              v-model.number="minPrice"
            >
                        <span class="price-range__divider">-</span>
            <input
              type="number"
              min="0"
              class="form-control filter-input"
              placeholder="Max"
              v-model.number="maxPrice"
            >
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="venue-filter-select">Venue</label>
          <select id="venue-filter-select" class="form-control filter-select" v-model="venueFilter">
            <option value="all">All Venues</option>
            <option v-for="venue in allVenues" :key="venue" :value="venue">
              {{ venue }}
            </option>
          </select>
        </div>

        <div class="filter-group filter-group--full">
          <label class="filter-label" for="location-query-input">Location</label>
          <input
            id="location-query-input"
            type="text"
            class="form-control filter-input"
            placeholder="Enter location..."
            v-model="locationQuery"
          >
        </div>
      </div>

        <div class="filters-divider" role="presentation"></div>

        <div class="filters-secondary">
        <div class="filter-group filter-group--chips">
          <span class="filter-label">Status</span>
          <div class="chip-group">
            <button
              v-for="option in statusOptions"
              :key="option.key"
              type="button"
              class="chip"
              :class="{ 'chip--active': isStatusActive(option.key) }"
              @click="handleStatusToggle(option.key)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="filter-group filter-group--clubs">
          <span class="filter-label">Clubs</span>
          <div class="club-controls">
            <select class="form-control filter-select" v-model="clubCategory">
              <option value="all">All Categories</option>
              <option
                v-for="category in clubCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
            <label
              class="checkbox-label"
              :class="{ 'checkbox-label--disabled': !canFilterByFollowing }"
            >
              <input
                type="checkbox"
                :disabled="!canFilterByFollowing"
                v-model="followedOnly"
              >
              <span class="checkbox-text">
                Only clubs I follow
                <span v-if="!canFilterByFollowing" class="helper-text">(sign in & follow clubs)</span>
              </span>
            </label>
          </div>
        </div>
      </div>

        <div class="filters-divider" role="presentation"></div>

        <div class="filters-footer">
          <button
            class="btn btn-outline-secondary filters-footer__reset"
            @click="handleResetFilters"
            v-if="hasActiveFilters"
          >
            Clear All Filters
          </button>

          <div class="results-count">
            <strong>{{ resultsCount }}</strong> event{{ resultsCount !== 1 ? 's' : '' }} found
          </div>
        </div>
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
    border: 2px solid var(--color-border);
    transition: border-color 0.2s ease;
}

.search-input:focus {
    outline: none;
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}


.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-16);
  margin-bottom: var(--space-24);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.filter-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.filter-select,
.filter-input {
  padding: var(--space-12);
  border-radius: var(--radius-base);
  font-size: var(--font-size-base);
  border: 1px solid var(--color-border);
  transition: border-color 0.2s ease;
  background-color: var(--color-surface);
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--color-primary, #007bff);
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.price-range {
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.price-range__divider {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-bold);
}

.filters-secondary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-16);
  margin-bottom: var(--space-24);
}

.filter-group--chips .filter-label,
.filter-group--clubs .filter-label {
  font-size: var(--font-size-base);
  color: var(--color-text);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.chip {
  padding: var(--space-8) var(--space-16);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-standard);
}

.chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.chip--active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

.club-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
  align-items: center;
}

.filter-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-16);
}

.left-options {
    display: flex;
    align-items: center;
    gap: var(--space-16);
    flex-wrap: wrap;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
    user-select: none;
}

.checkbox-label--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-label input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
    width: 18px;
    height: 18px;
}

.checkbox-text {
    font-size: var(--font-size-base);
    color: var(--color-text);
}

.helper-text {
  display: inline-block;
  margin-left: var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.reset-btn {
    padding: var(--space-8) var(--space-16);
    font-size: var(--font-size-sm);
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: all 0.2s ease;
}

.reset-btn:hover {
    background-color: var(--color-secondary, #6c757d);
    color: white;
}

.results-count {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
}

.results-count strong {
    color: var(--color-text);
    font-weight: var(--font-weight-bold);
}

/* Responsive Design */
@media (max-width: 768px) {
    .filter-options {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .left-options {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
    }

  .filters-secondary {
    grid-template-columns: 1fr;
  }
}
</style>