<script>
export default {
    data() {
        return {
            events: [
                {
                    id: 1,
                    title: "SCIS Major Talks AY25/26",
                    organiser: 'Ellipsis',
                    category: "Academic",
                    price: "FREE",
                    date: "Tue, 7 Oct 2025",
                    time: "10:00 AM - 2:30 PM",
                    location: "Virtual - Zoom",
                    attendees: "342 attending",
                    description: "Join us to learn more about the various majors and tracks offered in SCIS from the professors themselves - ALL SCIS students are welcome!",
                    image: "\\src\\assets\\dummy\\major-talks.png"
                },
                {
                    id: 2,
                    title: "UN PASO 2025: AS YOU WISH",
                    organiser: 'SMU Ardiente',
                    category: "Performance",
                    price: "$16",
                    date: "Sun, 12 Oct 2025",
                    time: "2:00 PM",
                    location: "SMU Arts & Culture Centre @ SOE/SCIS B1",
                    attendees: "150 / 200 attending",
                    description: "What happens when desire consumes us and greed unleashes chaos? Three friends make selfish choices that spiral into ruin — revealing a timeless truth: true richness lies not in what we crave, but in what we already hold. Witness this story told through the power of Latin Ballroom Dance",
                    image: "\\src\\assets\\dummy\\un-paso.png"

                },
                {
                    id: 3,
                    title: "Build With AWS GenAI",
                    organiser: 'SMUAI',
                    category: "Workshop",
                    price: "FREE",
                    date: "Tue, 7 Oct 2025",
                    time: "6:30 PM - 8:30PM",
                    location: "ALC Classroom 3-1 @ Connex Lvl 3",
                    attendees: "38 / 50 attending",
                    status: "Filling Fast",
                    description: "Curious how to go from idea to working GenAI demo on AWS? Join us for a skills-first workshop where you'll build, test, and refine ML & Generative AI solutions; guided by AWS-aligned practices and tooling.",
                    image: "\\src\\assets\\dummy\\build-with-aws-genai.png"
                },
                {
                    id: 4,
                    title: "SMU-SMC Transcendence",
                    organiser: 'SMU-SMC',
                    category: "Workshop",
                    price: "FREE",
                    date: "Fri, 17 Oct 2025",
                    time: "3:30 PM - 6:30PM",
                    location: "LKCSB SR2-3",
                    attendees: "12 / 40 attending",
                    description: "This is just the beginning of the Transcendence series, and it's more than just a skills workshop, it's an opportunity to elevate your personal brand and sharpen the way you present yourself professionally.",
                    image: "\\src\\assets\\dummy\\smu-smuc-transcendence.png"
                },
                {
                    id: 5,
                    title: "Beginner Fishing",
                    organiser: 'SMURF',
                    category: "Recreation",
                    price: "$10",
                    date: "Sat, 11 Oct 2025",
                    time: "9:00 AM - 1:00PM",
                    location: "Bedok Jetty",
                    attendees: "29 / 32 attending",
                    description: "This session is perfect for those with little to no experience — we'll provide the basic gear and teach you the essentials of fishing, including how to catch bait fish. Come join us for a fun and relaxing afternoon by the sea! 🌊🐟",
                    image: "\\src\\assets\\dummy\\beginner-fishing.png"
                    }
            ]
        }
    }
}
</script>

<template>
    <section class="events-grid">
        <div class="container">
            <div class="events-container">
                <div v-for="event in events" :key="event.id" class="event-card">
                    <div class="event-image">
                        <img v-if="event.image" :src="event.image" alt="Event Image" class="event-img"/>
                        <div v-else class="event-image-placeholder"></div>
                        <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                            {{ event.price }}
                        </div>
                    </div>

                    <div class="event-content">
                        <div class="event-header">
                            <span class="event-category">{{ event.category }}</span>
                            <span v-if="event.status" class="event-status">{{ event.status }}</span>
                        </div>

                        <h3 class="event-title">{{ event.title }}</h3>

                        <div class="event-details">
                            <div class="event-organiser">
                                <span>By {{ event.organiser }}</span>
                            </div>
                            <div class="event-datetime">
                                <span>{{ event.date }} | {{ event.time }}</span>
                            </div>
                            <div class="event-location">
                                <span>{{ event.location }}</span>
                            </div>
                            <div class="event-attendees">
                                <span>{{ event.attendees }}</span>
                            </div>
                        </div>

                        <p class="event-description">{{ event.description }}</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>



<style scoped>
.events-grid {
    padding: var(--space-32) 0;
    background-color: var(--color-background);
}

.events-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: var(--space-24);
}

.event-card {
    background-color: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-card-border);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: all var(--duration-normal) var(--ease-standard);
    cursor: pointer;
}

.event-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.event-image {
    position: relative;
    height: 200px;
    background: var(--color-bg-1);
}

.event-img {
  width: 100%;
  height: 100%;
  object-fit: cover; 
  object-position: center; 
  display: block;
}

.event-image-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--color-bg-1) 0%, var(--color-bg-2) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.event-price-tag {
    position: absolute;
    top: var(--space-12);
    right: var(--space-12);
    background-color: var(--color-charcoal-700);
    color: var(--color-white);
    padding: var(--space-4) var(--space-12);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
}

.price-free {
    background-color: var(--color-success) !important;
    color: var(--color-white) !important;
}

.event-content {
    padding: var(--space-20);
}

.event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-12);
}

.event-category {
    background-color: var(--color-secondary);
    color: var(--color-text);
    padding: var(--space-4) var(--space-12);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
}

.event-status {
    background-color: var(--color-warning);
    color: var(--color-white);
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
}

.event-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    margin: 0 0 var(--space-6) 0;
    line-height: var(--line-height-tight);
}

.event-details {
    margin-bottom: var(--space-16);
}

.event-details>div {
    margin-bottom: var(--space-8);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
}

.event-details>div:last-child {
    margin-bottom: 0;
}

.event-datetime {
    font-weight: var(--font-weight-medium);
}

.event-organiser span {
    font-weight: var(--font-weight-semibold, 550);
    font-size: var(--font-size-lg, 200px);
}

.event-description {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>