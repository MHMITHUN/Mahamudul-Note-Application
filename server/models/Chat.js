import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            maxLength: 200,
        },
        isTitleManual: {
            type: Boolean,
            default: false,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        content: {
            type: String,
            required: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Text index for search
ChatSchema.index({ title: 'text', content: 'text' });
ChatSchema.index({ updatedAt: -1 });

// Auto-generate title from first line if not manually set
ChatSchema.pre('save', function (next) {
    if (!this.isTitleManual && this.content) {
        const firstLine = this.content.split('\n')[0].replace(/[#*`]/g, '').trim();
        this.title = firstLine.substring(0, 50) || 'Untitled Note';
    }
    next();
});

export default mongoose.model('Chat', ChatSchema);
