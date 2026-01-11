import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxLength: 200,
        },
        content: {
            type: String,
            required: true,
            default: '',
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Create text index for search functionality
ChatSchema.index({ title: 'text', content: 'text' });

// Index for sorting by updatedAt
ChatSchema.index({ updatedAt: -1 });

// Auto-generate title from first line of content
ChatSchema.pre('save', function (next) {
    if (this.isModified('content') && this.content) {
        const firstLine = this.content.split('\n')[0].trim();
        this.title = firstLine.substring(0, 50) || 'Untitled Note';
    }
    next();
});

export default mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
