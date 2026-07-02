'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  LandingSectionContentMap,
  LandingSectionSlug,
  LANDING_SECTION_DEFAULTS,
  PricingPlanContent,
} from '@/lib/landingCms';

interface LandingSectionEditorProps<S extends LandingSectionSlug> {
  slug: S;
  value: LandingSectionContentMap[S];
  onChange: (value: LandingSectionContentMap[S]) => void;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function StringListEditor({
  label,
  items,
  onChange,
  addLabel = 'Add item',
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
        {addLabel}
      </Button>
    </div>
  );
}

function ListItemHeader({
  title,
  onRemove,
  removeLabel = 'Remove',
}: {
  title: string;
  onRemove: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRemove}>
        {removeLabel}
      </Button>
    </div>
  );
}

function createEmptyPricingPlan(): PricingPlanContent {
  return {
    id: `plan-${Date.now()}`,
    subscriptionKey: '',
    name: 'Paket baru',
    tagline: '',
    price: null,
    periodLabel: '1 bulan',
    features: [''],
    ctaLabel: 'Pilih Paket',
    style: 'dark',
    highlighted: false,
  };
}

function CtaFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { label: string; href: string };
  onChange: (value: { label: string; href: string }) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <div>
        <FieldLabel>Button label</FieldLabel>
        <Input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Link URL</FieldLabel>
        <Input value={value.href} onChange={(e) => onChange({ ...value, href: e.target.value })} />
      </div>
    </div>
  );
}

export function LandingSectionEditor<S extends LandingSectionSlug>({
  slug,
  value,
  onChange,
}: LandingSectionEditorProps<S>) {
  switch (slug) {
    case 'landing-nav': {
      const content = value as LandingSectionContentMap['landing-nav'];
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <FieldLabel>Navigation links</FieldLabel>
            {content.links.map((link, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-2 rounded-lg border border-gray-200 p-3">
                <Input
                  placeholder="Label"
                  value={link.label}
                  onChange={(e) => {
                    const links = [...content.links];
                    links[index] = { ...links[index], label: e.target.value };
                    onChange({ ...content, links } as LandingSectionContentMap[S]);
                  }}
                />
                <Input
                  placeholder="URL"
                  value={link.href}
                  onChange={(e) => {
                    const links = [...content.links];
                    links[index] = { ...links[index], href: e.target.value };
                    onChange({ ...content, links } as LandingSectionContentMap[S]);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>Login label</FieldLabel>
              <Input
                value={content.loginLabel}
                onChange={(e) =>
                  onChange({ ...content, loginLabel: e.target.value } as LandingSectionContentMap[S])
                }
              />
            </div>
            <div>
              <FieldLabel>Register label (desktop)</FieldLabel>
              <Input
                value={content.registerLabel}
                onChange={(e) =>
                  onChange({
                    ...content,
                    registerLabel: e.target.value,
                  } as LandingSectionContentMap[S])
                }
              />
            </div>
            <div>
              <FieldLabel>Register label (mobile)</FieldLabel>
              <Input
                value={content.mobileRegisterLabel}
                onChange={(e) =>
                  onChange({
                    ...content,
                    mobileRegisterLabel: e.target.value,
                  } as LandingSectionContentMap[S])
                }
              />
            </div>
          </div>
        </div>
      );
    }

    case 'hero': {
      const content = value as LandingSectionContentMap['hero'];
      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>Badge</FieldLabel>
            <Input
              value={content.badge}
              onChange={(e) =>
                onChange({ ...content, badge: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Headline (before highlight)</FieldLabel>
              <Input
                value={content.headline}
                onChange={(e) =>
                  onChange({ ...content, headline: e.target.value } as LandingSectionContentMap[S])
                }
              />
            </div>
            <div>
              <FieldLabel>Headline highlight</FieldLabel>
              <Input
                value={content.headlineHighlight}
                onChange={(e) =>
                  onChange({
                    ...content,
                    headlineHighlight: e.target.value,
                  } as LandingSectionContentMap[S])
                }
              />
            </div>
          </div>
          <div>
            <FieldLabel>Subtitle</FieldLabel>
            <Textarea
              rows={4}
              value={content.subtitle}
              onChange={(e) =>
                onChange({ ...content, subtitle: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <CtaFields
            label="Primary CTA"
            value={content.primaryCta}
            onChange={(primaryCta) =>
              onChange({ ...content, primaryCta } as LandingSectionContentMap[S])
            }
          />
          <CtaFields
            label="Secondary CTA"
            value={content.secondaryCta}
            onChange={(secondaryCta) =>
              onChange({ ...content, secondaryCta } as LandingSectionContentMap[S])
            }
          />
          <div className="space-y-3">
            <FieldLabel>Trust badges</FieldLabel>
            {content.trustBadges.map((badge, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-2 rounded-lg border border-gray-200 p-3">
                <Input
                  placeholder="Label"
                  value={badge.label}
                  onChange={(e) => {
                    const trustBadges = [...content.trustBadges];
                    trustBadges[index] = { ...trustBadges[index], label: e.target.value };
                    onChange({ ...content, trustBadges } as LandingSectionContentMap[S]);
                  }}
                />
                <Input
                  placeholder="Subtext"
                  value={badge.sub}
                  onChange={(e) => {
                    const trustBadges = [...content.trustBadges];
                    trustBadges[index] = { ...trustBadges[index], sub: e.target.value };
                    onChange({ ...content, trustBadges } as LandingSectionContentMap[S]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'features': {
      const content = value as LandingSectionContentMap['features'];
      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>Section title</FieldLabel>
            <Input
              value={content.title}
              onChange={(e) =>
                onChange({ ...content, title: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div>
            <FieldLabel>Section subtitle</FieldLabel>
            <Textarea
              rows={3}
              value={content.subtitle}
              onChange={(e) =>
                onChange({ ...content, subtitle: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div className="space-y-4">
            <FieldLabel>Feature cards</FieldLabel>
            {content.features.map((feature, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <Input
                  placeholder="Title"
                  value={feature.title}
                  onChange={(e) => {
                    const features = [...content.features];
                    features[index] = { ...features[index], title: e.target.value };
                    onChange({ ...content, features } as LandingSectionContentMap[S]);
                  }}
                />
                <Textarea
                  rows={3}
                  placeholder="Description"
                  value={feature.description}
                  onChange={(e) => {
                    const features = [...content.features];
                    features[index] = { ...features[index], description: e.target.value };
                    onChange({ ...content, features } as LandingSectionContentMap[S]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'why-different': {
      const content = value as LandingSectionContentMap['why-different'];
      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>Section title</FieldLabel>
            <Input
              value={content.title}
              onChange={(e) =>
                onChange({ ...content, title: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div>
            <FieldLabel>Section subtitle</FieldLabel>
            <Textarea
              rows={3}
              value={content.subtitle}
              onChange={(e) =>
                onChange({ ...content, subtitle: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div className="space-y-4">
            <FieldLabel>Value cards</FieldLabel>
            {content.cards.map((card, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <Input
                  placeholder="Title"
                  value={card.title}
                  onChange={(e) => {
                    const cards = [...content.cards];
                    cards[index] = { ...cards[index], title: e.target.value };
                    onChange({ ...content, cards } as LandingSectionContentMap[S]);
                  }}
                />
                <Textarea
                  rows={3}
                  placeholder="Description"
                  value={card.description}
                  onChange={(e) => {
                    const cards = [...content.cards];
                    cards[index] = { ...cards[index], description: e.target.value };
                    onChange({ ...content, cards } as LandingSectionContentMap[S]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'pricing': {
      const content = value as LandingSectionContentMap['pricing'];

      const updatePlan = (index: number, plan: PricingPlanContent) => {
        const plans = [...content.plans];
        plans[index] = plan;
        onChange({ ...content, plans } as LandingSectionContentMap[S]);
      };

      const removePlan = (index: number) => {
        onChange({
          ...content,
          plans: content.plans.filter((_, i) => i !== index),
        } as LandingSectionContentMap[S]);
      };

      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>Section title</FieldLabel>
            <Input
              value={content.title}
              onChange={(e) =>
                onChange({ ...content, title: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div>
            <FieldLabel>Section subtitle</FieldLabel>
            <Textarea
              rows={2}
              value={content.subtitle}
              onChange={(e) =>
                onChange({ ...content, subtitle: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Pricing types</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...content,
                    plans: [...content.plans, createEmptyPricingPlan()],
                  } as LandingSectionContentMap[S])
                }
              >
                Add pricing type
              </Button>
            </div>

            {content.plans.map((plan, index) => (
              <div key={plan.id} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <ListItemHeader
                  title={`Pricing type ${index + 1}`}
                  onRemove={() => removePlan(index)}
                  removeLabel="Remove pricing type"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Plan ID (internal)</FieldLabel>
                    <Input
                      value={plan.id}
                      onChange={(e) => updatePlan(index, { ...plan, id: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Subscription link (optional)</FieldLabel>
                    <select
                      value={plan.subscriptionKey || ''}
                      onChange={(e) =>
                        updatePlan(index, {
                          ...plan,
                          subscriptionKey: e.target.value as PricingPlanContent['subscriptionKey'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">None — use CMS price only</option>
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                      <option value="premium">premium</option>
                      <option value="therapist">therapist</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Plan name</FieldLabel>
                    <Input
                      value={plan.name}
                      onChange={(e) => updatePlan(index, { ...plan, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Tagline</FieldLabel>
                    <Input
                      value={plan.tagline}
                      onChange={(e) => updatePlan(index, { ...plan, tagline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Price (IDR)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={plan.price ?? ''}
                      onChange={(e) =>
                        updatePlan(index, {
                          ...plan,
                          price: e.target.value === '' ? null : Number(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to use subscription pricing (if linked). Set to 0 to explicitly
                      show Rp 0.
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Period label</FieldLabel>
                    <Input
                      placeholder="e.g. 1 bulan"
                      value={plan.periodLabel}
                      onChange={(e) => updatePlan(index, { ...plan, periodLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Badge (optional)</FieldLabel>
                    <Input
                      value={plan.badge || ''}
                      onChange={(e) => updatePlan(index, { ...plan, badge: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Card style</FieldLabel>
                    <select
                      value={plan.style}
                      onChange={(e) =>
                        updatePlan(index, {
                          ...plan,
                          style: e.target.value as PricingPlanContent['style'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                      <input
                        type="checkbox"
                        checked={!!plan.highlighted}
                        onChange={(e) =>
                          updatePlan(index, { ...plan, highlighted: e.target.checked })
                        }
                      />
                      Highlighted card
                    </label>
                  </div>
                  <div>
                    <FieldLabel>Checkout plan key (logged in)</FieldLabel>
                    <Input
                      placeholder="pro, premium..."
                      value={plan.checkoutPlan || ''}
                      onChange={(e) =>
                        updatePlan(index, { ...plan, checkoutPlan: e.target.value })
                      }
                    />
                  </div>
                </div>

                <StringListEditor
                  label="Feature bullets"
                  items={plan.features}
                  onChange={(features) => updatePlan(index, { ...plan, features })}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>CTA label (guest)</FieldLabel>
                    <Input
                      value={plan.ctaLabel}
                      onChange={(e) => updatePlan(index, { ...plan, ctaLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>CTA label (logged in)</FieldLabel>
                    <Input
                      value={plan.ctaLabelAuthenticated || ''}
                      onChange={(e) =>
                        updatePlan(index, { ...plan, ctaLabelAuthenticated: e.target.value })
                      }
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Leave price at 0 with a subscription link to use live subscription pricing. Use{' '}
                  <code>{'{{monthlyTokenLimit}}'}</code> in features when linked to pro/premium.
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'moments-cta': {
      const content = value as LandingSectionContentMap['moments-cta'];
      return (
        <div className="space-y-4">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={content.title}
              onChange={(e) =>
                onChange({ ...content, title: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div>
            <FieldLabel>Body</FieldLabel>
            <Textarea
              rows={4}
              value={content.body}
              onChange={(e) =>
                onChange({ ...content, body: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
        </div>
      );
    }

    case 'success-stories': {
      const content = value as LandingSectionContentMap['success-stories'];
      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>Section title</FieldLabel>
            <Input
              value={content.title}
              onChange={(e) =>
                onChange({ ...content, title: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Testimonials</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...content,
                    testimonials: [
                      ...content.testimonials,
                      { quote: '', author: '' },
                    ],
                  } as LandingSectionContentMap[S])
                }
              >
                Add testimonial
              </Button>
            </div>
            {content.testimonials.map((testimonial, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <ListItemHeader
                  title={`Testimonial ${index + 1}`}
                  onRemove={() =>
                    onChange({
                      ...content,
                      testimonials: content.testimonials.filter((_, i) => i !== index),
                    } as LandingSectionContentMap[S])
                  }
                  removeLabel="Remove testimonial"
                />
                <Textarea
                  rows={4}
                  placeholder="Quote"
                  value={testimonial.quote}
                  onChange={(e) => {
                    const testimonials = [...content.testimonials];
                    testimonials[index] = { ...testimonials[index], quote: e.target.value };
                    onChange({ ...content, testimonials } as LandingSectionContentMap[S]);
                  }}
                />
                <Input
                  placeholder="Author"
                  value={testimonial.author}
                  onChange={(e) => {
                    const testimonials = [...content.testimonials];
                    testimonials[index] = { ...testimonials[index], author: e.target.value };
                    onChange({ ...content, testimonials } as LandingSectionContentMap[S]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'faq': {
      const content = value as LandingSectionContentMap['faq'];
      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>Section title</FieldLabel>
            <Input
              value={content.title}
              onChange={(e) =>
                onChange({ ...content, title: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Questions</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...content,
                    items: [...content.items, { question: '', answer: '' }],
                  } as LandingSectionContentMap[S])
                }
              >
                Add FAQ
              </Button>
            </div>
            {content.items.map((item, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <ListItemHeader
                  title={`FAQ ${index + 1}`}
                  onRemove={() =>
                    onChange({
                      ...content,
                      items: content.items.filter((_, i) => i !== index),
                    } as LandingSectionContentMap[S])
                  }
                  removeLabel="Remove FAQ"
                />
                <Input
                  placeholder="Question"
                  value={item.question}
                  onChange={(e) => {
                    const items = [...content.items];
                    items[index] = { ...items[index], question: e.target.value };
                    onChange({ ...content, items } as LandingSectionContentMap[S]);
                  }}
                />
                <Textarea
                  rows={3}
                  placeholder="Answer"
                  value={item.answer}
                  onChange={(e) => {
                    const items = [...content.items];
                    items[index] = { ...items[index], answer: e.target.value };
                    onChange({ ...content, items } as LandingSectionContentMap[S]);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'steps': {
      const content = value as LandingSectionContentMap['steps'];
      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>Section title</FieldLabel>
            <Input
              value={content.title}
              onChange={(e) =>
                onChange({ ...content, title: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div>
            <FieldLabel>Section subtitle</FieldLabel>
            <Textarea
              rows={2}
              value={content.subtitle}
              onChange={(e) =>
                onChange({ ...content, subtitle: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div className="space-y-4">
            <FieldLabel>Steps</FieldLabel>
            {content.steps.map((step, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <Input
                  placeholder="Title"
                  value={step.title}
                  onChange={(e) => {
                    const steps = [...content.steps];
                    steps[index] = { ...steps[index], title: e.target.value };
                    onChange({ ...content, steps } as LandingSectionContentMap[S]);
                  }}
                />
                <Textarea
                  rows={2}
                  placeholder="Description"
                  value={step.description}
                  onChange={(e) => {
                    const steps = [...content.steps];
                    steps[index] = { ...steps[index], description: e.target.value };
                    onChange({ ...content, steps } as LandingSectionContentMap[S]);
                  }}
                />
              </div>
            ))}
          </div>
          <CtaFields
            label="Bottom CTA"
            value={content.cta}
            onChange={(cta) => onChange({ ...content, cta } as LandingSectionContentMap[S])}
          />
        </div>
      );
    }

    case 'footer': {
      const content = value as LandingSectionContentMap['footer'];
      return (
        <div className="space-y-6">
          <div>
            <FieldLabel>CTA title</FieldLabel>
            <Input
              value={content.ctaTitle}
              onChange={(e) =>
                onChange({ ...content, ctaTitle: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <CtaFields
            label="CTA button"
            value={content.cta}
            onChange={(cta) => onChange({ ...content, cta } as LandingSectionContentMap[S])}
          />
          <div>
            <FieldLabel>Tagline</FieldLabel>
            <Textarea
              rows={2}
              value={content.tagline}
              onChange={(e) =>
                onChange({ ...content, tagline: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
          <div className="space-y-4">
            <FieldLabel>Link groups</FieldLabel>
            {content.linkGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <Input
                  placeholder="Group title"
                  value={group.title}
                  onChange={(e) => {
                    const linkGroups = [...content.linkGroups];
                    linkGroups[groupIndex] = { ...linkGroups[groupIndex], title: e.target.value };
                    onChange({ ...content, linkGroups } as LandingSectionContentMap[S]);
                  }}
                />
                {group.links.map((link, linkIndex) => (
                  <div key={linkIndex} className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => {
                        const linkGroups = [...content.linkGroups];
                        const links = [...linkGroups[groupIndex].links];
                        links[linkIndex] = { ...links[linkIndex], label: e.target.value };
                        linkGroups[groupIndex] = { ...linkGroups[groupIndex], links };
                        onChange({ ...content, linkGroups } as LandingSectionContentMap[S]);
                      }}
                    />
                    <Input
                      placeholder="URL"
                      value={link.href}
                      onChange={(e) => {
                        const linkGroups = [...content.linkGroups];
                        const links = [...linkGroups[groupIndex].links];
                        links[linkIndex] = { ...links[linkIndex], href: e.target.value };
                        linkGroups[groupIndex] = { ...linkGroups[groupIndex], links };
                        onChange({ ...content, linkGroups } as LandingSectionContentMap[S]);
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div>
            <FieldLabel>Copyright</FieldLabel>
            <Input
              value={content.copyright}
              onChange={(e) =>
                onChange({ ...content, copyright: e.target.value } as LandingSectionContentMap[S])
              }
            />
          </div>
        </div>
      );
    }

    default:
      return (
        <p className="text-sm text-gray-500">
          No editor available. Reset to defaults to start from the current landing page copy.
        </p>
      );
  }
}

export function getDefaultLandingSectionContent<S extends LandingSectionSlug>(
  slug: S
): LandingSectionContentMap[S] {
  return structuredClone(LANDING_SECTION_DEFAULTS[slug]);
}
