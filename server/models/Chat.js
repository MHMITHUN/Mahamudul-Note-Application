import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

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
        password: {
            type: String,
            select: false, // Don't return password hash by default
        },
        isProtected: {
            type: Boolean,
            default: false,
        },
        folderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Folder',
            default: null, // null = root folder (no folder)
        },
        viewCount: {
            type: Number,
            default: 0,
        },
        lastViewedBy: {
            type: Map,
            of: Date, // Map of sessionId/IP -> last viewed timestamp
            default: new Map(),
        },
        subnotes: [{
            title: {
                type: String,
                trim: true,
                default: 'Untitled Subnote'
            },
            content: {
                type: String,
                default: ''
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            updatedAt: {
                type: Date,
                default: Date.now
            }
        }],
    },
    {
        timestamps: true,
    }
);

// Text index for search
ChatSchema.index({ title: 'text', content: 'text' });
ChatSchema.index({ updatedAt: -1 });

// Auto-generate title from first line if not manually set & handle password hashing
ChatSchema.pre('save', async function (next) {
    if (!this.isTitleManual && this.content) {
        const firstLine = this.content.split('\n')[0].replace(/[#*`]/g, '').trim();
        this.title = firstLine.substring(0, 50) || 'Untitled Note';
    }

    if (this.isModified('password')) {
        if (!this.password) {
            this.isProtected = false;
            return next();
        }
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
            this.isProtected = true;
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Method to verify password
ChatSchema.methods.verifyPassword = async function (candidatePassword) {
    if (!this.password) return true; // No password set
    if (!candidatePassword) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON responses
ChatSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

export default mongoose.model('Chat', ChatSchema);
