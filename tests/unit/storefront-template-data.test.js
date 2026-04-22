const { buildTemplateData } = require("../../server/src/services/storefront.service");

describe("storefront template data", () => {
  it("shapes music storefront data from live products", () => {
    const data = buildTemplateData(
      {
        templateKey: "music",
        storeName: "Signal House",
      },
      [
        {
          id: 11,
          title: "Night Waves EP",
          description: "An EP with layered synth textures and ocean percussion.",
          price: 24,
          delivery: "Digital download",
          createdAt: "2026-03-10T00:00:00.000Z",
          variants: [
            {
              attributes: {
                previewUrl: "https://example.com/night-waves-preview.mp3",
                duration: "18 min",
                bpm: "102",
              },
            },
          ],
          images: [{ url: "/assets/night-waves.jpg" }],
        },
        {
          id: 12,
          title: "Private vocal lesson",
          description: "One-on-one vocal coaching for developing artists.",
          price: 65,
          delivery: "Zoom lesson",
          createdAt: "2026-03-12T00:00:00.000Z",
          variants: [
            {
              attributes: {
                duration: "60 min",
              },
            },
          ],
          images: [],
        },
      ]
    );

    expect(data.music).toBeTruthy();
    expect(data.music.libraryItems).toHaveLength(2);
    expect(data.music.stats.lessonCount).toBe(1);
    expect(data.music.availableKinds).toContain("ep");
    expect(data.music.availableKinds).toContain("lesson");

    const release = data.music.libraryItems.find((item) => item.id === 11);
    expect(release.kind).toBe("ep");
    expect(release.previewUrl).toBe("https://example.com/night-waves-preview.mp3");
    expect(release.bpmLabel).toBe("102");
    expect(release.durationLabel).toBe("18 min");
  });

  it("shapes classes storefront data from live products", () => {
    const data = buildTemplateData(
      {
        templateKey: "classes",
        storeName: "Ocean Studio",
      },
      [
        {
          id: 21,
          title: "Confidence Cohort Course",
          description: "A live weekly cohort with guided reflection and feedback.",
          price: 180,
          delivery: "Live Zoom cohort",
          stockQuantity: 12,
          createdAt: "2026-03-11T00:00:00.000Z",
          variants: [
            {
              attributes: {
                duration: "6 weeks",
                level: "Intermediate",
              },
            },
          ],
        },
        {
          id: 22,
          title: "Reflection Toolkit Resource",
          description: "A digital workbook and practice prompts.",
          price: 28,
          delivery: "Digital download",
          stockQuantity: 0,
          createdAt: "2026-03-09T00:00:00.000Z",
          variants: [
            {
              attributes: {
                duration: "Self-paced",
              },
            },
          ],
        },
        {
          id: 23,
          title: "Weekend Workshop Intensive",
          description: "An archived in-person workshop for past cohorts.",
          price: 95,
          delivery: "In person workshop",
          stockQuantity: 0,
          status: "archived",
          createdAt: "2026-02-20T00:00:00.000Z",
          variants: [],
        },
      ]
    );

    expect(data.classes.allPrograms).toHaveLength(3);
    expect(data.classes.upcomingPrograms).toHaveLength(2);
    expect(data.classes.pastPrograms).toHaveLength(1);
    expect(data.classes.stats.livePrograms).toBe(2);
    expect(data.classes.stats.resourcePrograms).toBe(1);

    const course = data.classes.allPrograms.find((program) => program.id === 21);
    expect(course.programType).toBe("course");
    expect(course.formatLabel).toBe("Live");
    expect(course.capacityLabel).toBe("12 seats open");
    expect(course.levelLabel).toBe("Intermediate");

    const resource = data.classes.allPrograms.find((program) => program.id === 22);
    expect(resource.programType).toBe("resource");
    expect(resource.formatLabel).toBe("Self-paced");
  });

  it("shapes photography storefront data from live products", () => {
    const data = buildTemplateData(
      {
        templateKey: "photography",
        storeName: "Luma Studio",
      },
      [
        {
          id: 31,
          title: "Storm Horizon Print",
          description: "Large format archival print from a coastal landscape series.",
          price: 320,
          delivery: "Courier print delivery",
          createdAt: "2026-03-01T00:00:00.000Z",
          images: [{ url: "/assets/storm-horizon.jpg" }],
          variants: [
            {
              attributes: {
                size: "A1",
                license: "Personal display",
              },
            },
          ],
        },
        {
          id: 32,
          title: "Editorial campaign coverage",
          description: "Editorial and brand campaign photography with licensing options.",
          price: 980,
          delivery: "Shoot planning",
          createdAt: "2026-03-05T00:00:00.000Z",
          variants: [
            {
              attributes: {
                license: "Commercial usage",
              },
            },
          ],
        },
      ]
    );

    expect(data.photography.galleryItems).toHaveLength(2);
    expect(data.photography.serviceItems).toHaveLength(1);
    expect(data.photography.availableTypes).toContain("print");
    expect(data.photography.availableTypes).toContain("license");
    expect(data.photography.stats.licensingCount).toBe(1);
  });

  it("shapes programmer storefront data from live products", () => {
    const data = buildTemplateData(
      {
        templateKey: "programmer",
        storeName: "Stack Foundry",
      },
      [
        {
          id: 41,
          title: "Growth stack retainer",
          description: "Ongoing React, Node.js, and PostgreSQL support for shipping teams.",
          price: 2400,
          createdAt: "2026-03-07T00:00:00.000Z",
          variants: [
            {
              label: "Starter",
              priceOverride: 1200,
              attributes: {
                stack: "React, Node.js, PostgreSQL",
                timeline: "Monthly cadence",
              },
            },
            {
              label: "Flagship",
              priceOverride: 3600,
            },
          ],
        },
      ]
    );

    expect(data.programmer.offers).toHaveLength(1);
    expect(data.programmer.packageHighlights).toHaveLength(1);
    expect(data.programmer.stackTags).toContain("React");
    expect(data.programmer.stats.retainerCount).toBe(1);
    expect(data.programmer.offers[0].packageVariants[0].label).toBe("Starter");
  });
});
