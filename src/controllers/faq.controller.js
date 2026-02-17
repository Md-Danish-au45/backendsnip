import FAQ from "../models/faq.model.js";
import slugify from "slugify";

const buildFaqSlug = (question = "faq") =>
  slugify(String(question), { lower: true, strict: true, trim: true }) || "faq";

const createUniqueFaqSlug = async (question, excludeId = null) => {
  const base = buildFaqSlug(question);
  let candidate = base;
  let suffix = 1;

  while (
    await FAQ.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
};

const withSeoDefaults = (faqDoc) => {
  const faq = faqDoc?.toObject ? faqDoc.toObject() : faqDoc;
  if (!faq) return faq;

  const plainAnswer = String(faq.answer || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...faq,
    slug: faq.slug || buildFaqSlug(faq.question),
    seoTitle: faq.seoTitle || faq.question,
    metaDescription: faq.metaDescription || plainAnswer.slice(0, 155),
  };
};

export const createFAQ = async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.slug = await createUniqueFaqSlug(payload.question);

    const faq = await FAQ.create(payload);
    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: withSeoDefaults(faq),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getFAQs = async (req, res) => {
  try {
    const { category, subCategory, includeUnpublished } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (includeUnpublished !== "true") filter.isPublished = true;

    const faqs = await FAQ.find(filter).sort({ updatedAt: -1, createdAt: -1 });

    const slugBackfillOps = [];
    const seenSlugs = new Set();
    const normalizedFaqs = [];

    for (const faq of faqs) {
      let slug = faq.slug || buildFaqSlug(faq.question);
      if (seenSlugs.has(slug)) {
        slug = `${slug}-${faq._id.toString().slice(-6)}`;
      }
      seenSlugs.add(slug);

      if (faq.slug !== slug) {
        slugBackfillOps.push({
          updateOne: {
            filter: { _id: faq._id },
            update: { $set: { slug } },
          },
        });
      }

      normalizedFaqs.push(withSeoDefaults({ ...faq.toObject(), slug }));
    }

    if (slugBackfillOps.length) {
      await FAQ.bulkWrite(slugBackfillOps);
    }

    res.json({
      success: true,
      count: normalizedFaqs.length,
      data: normalizedFaqs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFAQBySlug = async (req, res) => {
  try {
    const faq = await FAQ.findOne({
      slug: req.params.slug,
      isPublished: true,
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.json({
      success: true,
      data: withSeoDefaults(faq),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFAQ = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.question || payload.slug) {
      payload.slug = await createUniqueFaqSlug(payload.question || payload.slug, req.params.id);
    }

    const faq = await FAQ.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!faq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    res.json({
      success: true,
      message: "FAQ updated",
      data: withSeoDefaults(faq),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const deleted = await FAQ.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }
    res.json({ success: true, message: "FAQ deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
