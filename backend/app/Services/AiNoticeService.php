<?php

namespace App\Services;

class AiNoticeService
{
    /**
     * Generate bilingual notice in Bengali & English from prompt and tone (#44)
     */
    public function generateNotice(string $prompt, string $tone = 'formal', string $category = 'general'): array
    {
        $promptLower = strtolower($prompt);

        if (str_contains($promptLower, 'water') || str_contains($promptLower, 'পানি')) {
            return [
                'title_bn' => 'জরুরি নোটিশ: সাময়িক পানি সরবরাহ বন্ধ থাকবে',
                'body_bn' => "সকল সম্মানিত মেস সদস্যের অবগতির জন্য জানানো যাচ্ছে যে, পানির ট্যাংক পরিষ্কার ও জরুরি পাইপলাইন মেরামতের কারণে আগামী কাল সকাল ৯:০০ টা থেকে দুপুর ২:০০ টা পর্যন্ত পানি সরবরাহ সাময়িকভাবে বন্ধ থাকবে। দয়া করে প্রয়োজনীয় পানি আগে থেকেই সংরক্ষণ করে রাখুন।\n\nধন্যবাদান্তে,\nমেস কর্তৃপক্ষ",
                'title_en' => 'Urgent Notice: Temporary Water Supply Interruption',
                'body_en' => "Dear Residents, Please be informed that the municipal water tank cleaning and maintenance will take place tomorrow from 9:00 AM to 2:00 PM. Water supply will be temporarily suspended during this window. Kindly store necessary water in advance.\n\nBest Regards,\nMess Management",
                'category' => 'utilities',
                'suggested_pinned' => true,
            ];
        }

        if (str_contains($promptLower, 'gas') || str_contains($promptLower, 'গ্যাস')) {
            return [
                'title_bn' => 'নোটিশ: তিতাস গ্যাস লাইনে স্বল্প চাপ ও রান্নার সময়সূচি',
                'body_bn' => "সকল সদস্যদের দৃষ্টি আকর্ষণ করা হচ্ছে যে, গ্যাস লাইনে অতিরিক্ত লো-প্রেসার থাকার কারণে দুপুরের রান্নায় কিছুটা বিলম্ব হতে পারে। মেস বাবুর্চি যথাসম্ভব দ্রুত বিকল্প উপায়ে মিল প্রস্তুত করার চেষ্টা করছেন। আপনাদের ধৈর্য ও সহযোগিতা কাম্য।\n\nধন্যবাদান্তে,\nমেস ম্যানেজার",
                'title_en' => 'Notice: Low Gas Pressure & Adjusted Dining Schedule',
                'body_en' => "Dear Residents, Due to low gas grid pressure in our sector, lunch preparation may experience a short delay. Our kitchen staff is actively preparing meals using backup arrangements. We sincerely appreciate your patience and understanding.\n\nRegards,\nMess Manager",
                'category' => 'dining',
                'suggested_pinned' => true,
            ];
        }

        if (str_contains($promptLower, 'feast') || str_contains($promptLower, 'দাওয়াত') || str_contains($promptLower, 'বিরিয়ানি') || str_contains($promptLower, 'party')) {
            return [
                'title_bn' => 'বিশেষ আয়োজন: মেস স্পেশাল ডিনার ও পুনর্মিলনী',
                'body_bn' => "আনন্দঘন পরিবেশে জানাচ্ছি যে, আগামী শুক্রবার রাতে আমাদের মেসে বিশেষ খাসির কাচ্চি বিরিয়ানি ও ফিরনি ডিনারের আয়োজন করা হয়েছে। সকল সদস্যকে নির্দিষ্ট সময়ের মধ্যে মিল কাউন্ট নিশ্চিত করার অনুরোধ করা হচ্ছে। কোনো অতিথি থাকলে আগে থেকে বুকিং করুন।\n\nশুভ কামনায়,\nমেস কমিটি",
                'title_en' => 'Special Announcement: Grand Mess Feast & Community Dinner',
                'body_en' => "We are excited to announce our Grand Community Feast this coming Friday night featuring Kacchi Biryani and dessert! Please confirm your meal status in the app before the cutoff time. For guest meal bookings, kindly notify management early.\n\nWarmly,\nMess Committee",
                'category' => 'celebration',
                'suggested_pinned' => false,
            ];
        }

        if (str_contains($promptLower, 'curfew') || str_contains($promptLower, 'gate') || str_contains($promptLower, 'গেট') || str_contains($promptLower, 'নিয়ম')) {
            return [
                'title_bn' => 'সতর্কীকরণ নোটিশ: রাত ১১:০০ টায় প্রধান ফটক বন্ধ সংক্রান্ত',
                'body_bn' => "মেসের শৃঙ্খলা ও সার্বিক নিরাপত্তার স্বার্থে সকলকে মনে করিয়ে দেওয়া হচ্ছে যে, রাত ১১:০০ টার পর প্রধান প্রবেশদ্বার স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে। বিশেষ কোনো জরুরি কারণ ছাড়া বিলম্বে প্রবেশের অনুমতি দেওয়া হবে না। নিয়ম মেনে চলুন ও নিরাপদ থাকুন।\n\nআদেশক্রমে,\nমেস প্রশাসন",
                'title_en' => 'Security Reminder: Strict 11:00 PM Main Gate Curfew',
                'body_en' => "For collective safety and security, all residents are reminded that the main building gate locks promptly at 11:00 PM every night. Late entry requires prior emergency authorization from management. Please adhere to mess living guidelines.\n\nBy Order,\nMess Administration",
                'category' => 'rules',
                'suggested_pinned' => true,
            ];
        }

        // Generic AI Template based on prompt
        $cleanPrompt = ucfirst(trim($prompt));
        return [
            'title_bn' => "জরুরি নোটিশ: {$cleanPrompt}",
            'body_bn' => "সকল সম্মানিত মেস সদস্যবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, {$cleanPrompt}। এই বিষয়ে মেসের প্রতিটি সদস্যের পূর্ণ সহযোগিতা কামনা করছি। কোনো প্রশ্ন বা সমস্যা থাকলে দ্রুত মেস ম্যানেজারের সাথে যোগাযোগ করুন।\n\nধন্যবাদান্তে,\nমেস কর্তৃপক্ষ",
            'title_en' => "Official Notice: {$cleanPrompt}",
            'body_en' => "Dear Residents, Please take note regarding: {$cleanPrompt}. We kindly request everyone's proactive cooperation. Should you have any inquiries or special requirements, please reach out to the management immediately.\n\nBest Regards,\nMess Management",
            'category' => $category,
            'suggested_pinned' => $tone === 'urgent',
        ];
    }
}
