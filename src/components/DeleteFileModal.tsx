import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/modal';
import { Button } from './ui/button';
import { AlertTriangle, Trash2, Minus } from 'lucide-react';

interface DeleteFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteType: 'association' | 'complete') => void;
  fileName: string;
  type: 'quote' | 'job';
}

export function DeleteFileModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  fileName, 
  type 
}: DeleteFileModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Delete File
          </DialogTitle>
          <DialogDescription>
            How would you like to delete <span className="font-semibold">"{fileName}"</span>?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <button
              onClick={() => onConfirm('association')}
              className="w-full p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <Minus className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">Remove from this {type} only</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The file will remain in the customer folder and can still be used in other quotes/jobs.
                  </p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => onConfirm('complete')}
              className="w-full p-4 border rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">Delete completely</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The file will be permanently deleted from the customer folder and removed from ALL quotes/jobs.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
